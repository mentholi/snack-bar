# SmackBar

Bar electron app.

## Building

* Install requirements:
```npm install```

Build the app:
```
./build.sh
```
or
```
./node_modules/.bin/nativefier --darwin-dark-mode-support --clear-cache --icon giosg_ball_1024.png --platform macos --name "Smackbar" https://service.giosg.com/bar
```

## Run app after building
Go to `Smackbar-darwin-x64/` and start `Smackbar.app`.