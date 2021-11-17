'use strict';

const Gio = imports.gi.Gio;
const Meta = imports.gi.Meta;
const Shell = imports.gi.Shell;
const Main = imports.ui.main;
const MessageTray = imports.ui.messageTray;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

const Keybindings = Me.imports.keybindings;
const utils = Me.imports.utils;

const ScreenpadSysfsPath = '/sys/class/leds/asus::screenpad';

class Extension {
    constructor() {
        this._firstRun = true;
    }

    enable() {
        if (this._firstRun) {
            this._screenpadBrightnessFile = Gio.File.new_for_path(`${ScreenpadSysfsPath}/brightness`);
            if (!this._screenpadBrightnessFile.query_exists(null)) {
                this._showNotification(
                    'The Screenpad brightness file does not exist',
                    'Ensure the asus-wmi-screenpad module is installed and loaded and that your device is compatible with this module.',
                    'Click here to see how to do this',
                    function () {
                        Gio.AppInfo.launch_default_for_uri_async(
                            'https://github.com/Plippo/asus-wmi-screenpad#readme',
                            null,
                            null,
                            null
                        );
                    }
                );
            } else {
                utils.checkInstalled().then((result) => {
                    switch (result) {
                        case utils.EXIT_SUCCESS:
                            // Only check for the udev rule if the additional files are installed
                            const udevRuleFile = Gio.File.new_for_path('/etc/udev/rules.d/99-screenpad.rules');
                            if (udevRuleFile.query_exists(null)) {
                                this._showNotification(
                                    'You still have the old udev rule on your system',
                                    "This rule was previously used to get write access on the brightness file, but it isn't needed anymore.",
                                    'Click here to see how to remove it',
                                    function () {
                                        Gio.AppInfo.launch_default_for_uri_async(
                                            'https://github.com/laurinneff/gnome-shell-extension-zenbook-duo/blob/master/docs/permissions.md#removing-the-old-udev-rule',
                                            null,
                                            null,
                                            null
                                        );
                                    }
                                );
                            }
                            break;
                        case utils.EXIT_NOT_INSTALLED:
                            this._showNotification(
                                'This extension requires additional configuration',
                                "In order for this extension to work, it needs to install some files. You can undo this in the extension's settings.",
                                'Click here to do this automatically',
                                async function () {
                                    switch (await utils.install()) {
                                        case utils.EXIT_SUCCESS:
                                            this._showNotification(
                                                'Successfully installed files',
                                                'The files have been installed successfully. You can now use the extension.'
                                            );
                                            break;
                                        case utils.EXIT_FAILURE:
                                            this._showNotification(
                                                'Failed to install the files',
                                                'The files could not be installed.'
                                            );
                                            break;
                                    }
                                }
                            );
                            break;
                        case utils.EXIT_NEEDS_UPDATE:
                            this._showNotification(
                                'The additional files for the Screenpad+ extension requires an update',
                                'The extension has been updated, but the additional files need to be updated separately.',
                                'Click here to do this automatically',
                                async function () {
                                    switch (await utils.install()) {
                                        case utils.EXIT_SUCCESS:
                                            this._showNotification(
                                                'Successfully updated files',
                                                'The files have been files successfully. You can now use the extension.'
                                            );
                                            break;
                                        case utils.EXIT_FAILURE:
                                            this._showNotification(
                                                'Failed to update the files',
                                                'The files could not be updated.'
                                            );
                                            break;
                                    }
                                }
                            );
                            break;
                    }
                });
            }

            /*
                This variable is kept between enabling/disabling (so that the extension doesn't check if the
                brightness file exists and if the additional files are installed after unlocking the screen)
            */
            this._firstRun = false;
        }

        this.settings = ExtensionUtils.getSettings('org.gnome.shell.extensions.zenbook-duo');

        this._keybindingManager = new Keybindings.Manager();

        // Screenpad toggle key
        this._keybindingManager.add(
            'Launch7',
            async function () {
                try {
                    let brightness = await this._getBrightness();
                    if (brightness === 0) {
                        // Range from 1 to 255 so the screenpad can't be turned off completely by changing the brightness
                        this._setBrightness(this._brightnessSlider.value * 254 + 1);
                    } else {
                        this._setBrightness(0);
                    }
                } catch (e) {
                    logError(e);
                }
            }.bind(this)
        );

        // Swap windows key
        this._keybindingManager.add(
            'Launch6',
            function () {
                // TODO: Swap windows
                this._showNotification('This key is not implemented yet.');
            }.bind(this)
        );

        // Screenshot key
        this._keybindingManager.add(
            '<Shift><Super>s',
            function () {
                let args;

                switch (this.settings.get_string('screenshot-type')) {
                    case 'Screen':
                        args = []; // gnome-screenshot without args will take a screenshot of the whole screen
                        break;
                    case 'Window':
                        args = ['--window'];
                        break;
                    case 'Selection':
                        args = ['--area'];
                        break;
                    case 'Interactive':
                        args = ['--interactive'];
                        break;
                }

                if (this.settings.get_boolean('screenshot-include-cursor')) {
                    args.push('--include-pointer');
                }

                try {
                    // The process starts running immediately after this function is called. Any
                    // error thrown here will be a result of the process failing to start, not
                    // the success or failure of the process itself.
                    let proc = Gio.Subprocess.new(
                        // The program and command options are passed as a list of arguments
                        ['gnome-screenshot', ...args],

                        // The flags control what I/O pipes are opened and how they are directed
                        Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_PIPE
                    );
                } catch (e) {
                    logError(e);
                }
            }.bind(this)
        );

        // MyASUS key
        this._keybindingManager.add(
            'Tools',
            function () {
                try {
                    // The process starts running immediately after this function is called. Any
                    // error thrown here will be a result of the process failing to start, not
                    // the success or failure of the process itself.
                    let proc = Gio.Subprocess.new(
                        // The program and command options are passed as a list of arguments
                        ['sh', '-c', this.settings.get_string('myasus-cmd')],

                        // The flags control what I/O pipes are opened and how they are directed
                        Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_PIPE
                    );
                } catch (e) {
                    logError(e);
                }
            }.bind(this)
        );

        // Toggle webcam key
        this._keybindingManager.add(
            'WebCam',
            function () {
                // TODO: Toggle camera
                this._showNotification('This key is not implemented yet.');
            }.bind(this)
        );

        this._brightnessSlider = imports.ui.main.panel.statusArea.aggregateMenu._brightness._slider;
        this._brightnessListenerId = this._brightnessSlider.connect(
            'notify::value',
            async function () {
                try {
                    if ((await this._getBrightness()) === 0) return; // Don't turn Screenpad on when it was turned off

                    // Range from 1 to 255 so the screenpad can't be turned off completely by changing the brightness
                    await this._setBrightness(this._brightnessSlider.value * 254 + 1);
                } catch (e) {
                    logError(e);
                }
            }.bind(this)
        );

        this.settings.connect(
            'changed::uninstall',
            async function () {
                if (this.settings.get_boolean('uninstall')) {
                    switch (await utils.uninstall()) {
                        case utils.EXIT_SUCCESS:
                            this._showNotification(
                                'Successfully uninstalled files',
                                'The files have been uninstalled successfully. You can now remove the extension.'
                            );
                            break;
                        case utils.EXIT_FAILURE:
                            this._showNotification(
                                'Failed to uninstall the files',
                                'The files could not be uninstalled.'
                            );
                            break;
                    }
                    this.settings.set_boolean('uninstall', false);
                }
            }.bind(this)
        );
    }

    disable() {
        this._brightnessSlider.disconnect(this._brightnessListenerId);
        this._keybindingManager.destroy();
        if (this._notifSource) {
            this._notifSource.destroy();
            this._notifSource = null;
        }
        this._keybindingManager = null;
        this.settings = null;
    }

    // Shamelessly stolen from https://github.com/RaphaelRochet/arch-update/blob/3d3f5927ec0d33408a802d6d38af39c1b9b6f8e5/extension.js#L473-L497
    _showNotification(title, message, btnText, btnAction) {
        if (this._notifSource == null) {
            // We have to prepare this only once
            this._notifSource = new MessageTray.SystemNotificationSource();
            // Take care of note leaving unneeded sources
            this._notifSource.connect('destroy', () => {
                this._notifSource = null;
            });
            Main.messageTray.add(this._notifSource);
        }
        let notification = null;
        notification = new MessageTray.Notification(this._notifSource, title, message);
        if (btnText) notification.addAction(btnText, btnAction.bind(this));
        notification.setTransient(true);
        this._notifSource.showNotification(notification);
    }

    async _getBrightness() {
        const ret = await utils.runScreenpadTool(false, 'get');
        return +ret.stdout;
    }

    async _setBrightness(brightness) {
        const ret = await utils.runScreenpadTool(true, 'set', Math.floor(brightness).toString());
        return ret.ok;
    }
}

function init() {
    return new Extension();
}
