# Asus ZenBook Duo Integration for GNOME

This GNOME extension adds controlls to Quicksettings, allowing brightness change for second screen of Asus ZenBook Duo.

This is a fork of [mjollnir14/gnome-shell-extension-zenbook-duo](https://github.com/mjollnir14/gnome-shell-extension-zenbook-duo) and [lunaneff/gnome-shell-extension-zenbook-duo](https://github.com/lunaneff/gnome-shell-extension-zenbook-duo), since both repositories seem to be abandoned.


## Supported hardware

| Model    | Supported? | Additional notes                           | Confirmed by |
| -------- | :--------: | ------------------------------------------ | ------------ |
| UX481FLY |     ✅     |                                            | @laurinneff  |
| UX482EA  |     ✅     | without NVIDIA GPU                         | @jibsaramnim |
| UX482EG  |     ❔     | with NVIDIA GPU                            |              |
| UX8402   |     ✅     | without NVIDIA GPU, Ubuntu 23.04           | @allofmex    |

<!-- Use ✅ for supported, ❔ for unknown/unconfirmed, ❌ for unsupported -->


## Installation

This extension requires the [asus-wmi-screenpad](https://github.com/Plippo/asus-wmi-screenpad) kernel module, please install this first.

```shell
curl -L -o gnome-shell-extension-zenbook-duo.tar.gz $(curl -s https://api.github.com/repos/allofmex/gnome-shell-extension-zenbook-duo/releases/latest | grep "tarball_url" | awk '{ print $2 }' | sed 's/,$//' | sed 's/"//g')
mkdir gnome-shell-extension-zenbook-duo
tar --extract --file=gnome-shell-extension-zenbook-duo.tar.gz --strip-components=1 --directory ./gnome-shell-extension-zenbook-duo
rm ./gnome-shell-extension-zenbook-duo.tar.gz
cd gnome-shell-extension-zenbook-duo
make install
```

Make sure to **logout** and **login**!

Open "Extension" app, enable gnome-shell-extension-zenbook-duo.
(In case of problems try another logout -> login)


## Usage

This extension will add a second brightness slider to Quicksettings (where your volume/wifi/... toggles are) to control Screenpad brightness.
It will also add functionality to some of your Asus hardware keys like Toggle-Screenpad and MyAsus key.

It will **not** link the brightness hardware keys to Screenpad display (as of now).


## Debugging

To test if asus-wmi-screenpad dependency is working, run the following in a terminal

```
echo 255 > '/sys/class/leds/asus::screenpad/brightness'
```

This should have set screenpad brightness to max (or less if you replace 255 by lower value). If this is not working, check the kernel module setup of asus-wmi-screenpad.


If above is working but extension still does not work (especially after updates), then try:
- delete extension in extension manager
- delete/rename your previously downloaded gnome-shell-extension-zenbook-duo folder and start with with a fresh install. (you may also try `git clone` instead of curl)


## Other usefull hints for Zenbook Duo

#### Touchscreen mapping of screenpad
To map the screenpad touchscreen to correct display, run

```
# This is for UX8402 (vendor:product id is case sensitive for gsettings!)
gsettings set org.gnome.desktop.peripherals.touchscreen:/org/gnome/desktop/peripherals/touchscreens/04f3:2f2a/ output "['BOE', '0x0a8d', '0x00000000', 'DP-1']"
```
More details [here](https://unix.stackexchange.com/a/785627/491910).
