const {
  app,
  BrowserWindow,
  globalShortcut,
  ipcMain,
} = require("electron");

const path = require("path");

const {
  spawn,
} = require("child_process");

let mainWindow = null;

let keyboardBlocker = null;

const EXAM_URL =
  process.env.EXAM_URL ||
  "http://localhost:5173";

function startKeyboardBlocker() {
  if (process.platform !== "win32") {
    console.log(
      "Native keyboard blocker is only available on Windows."
    );

    return;
  }

  const blockerPath =
    path.join(
      __dirname,
      "native-lock",
      "bin",
      "Release",
      "net8.0-windows",
      "win-x64",
      "publish",
      "KeyboardBlocker.exe"
    );

  console.log(
    "Starting keyboard blocker:",
    blockerPath
  );

  keyboardBlocker = spawn(
    blockerPath,
    [],
    {
      windowsHide: true,
      detached: false,
    }
  );

  keyboardBlocker.on(
    "error",
    (error) => {
      console.error(
        "Keyboard blocker error:",
        error
      );
    }
  );

  keyboardBlocker.stdout?.on(
    "data",
    (data) => {
      console.log(
        `KeyboardBlocker: ${data}`
      );
    }
  );

  keyboardBlocker.stderr?.on(
    "data",
    (data) => {
      console.error(
        `KeyboardBlocker: ${data}`
      );
    }
  );
}

function stopKeyboardBlocker() {
  if (!keyboardBlocker) {
    return;
  }

  try {
    keyboardBlocker.kill();
  } catch (error) {
    console.error(error);
  }

  keyboardBlocker = null;
}

function createWindow() {
  mainWindow =
    new BrowserWindow({
      width: 1400,
      height: 900,

      fullscreen: true,

      kiosk: true,

      frame: false,

      backgroundColor:
        "#0f172a",

      autoHideMenuBar: true,

      webPreferences: {
        preload:
          path.join(
            __dirname,
            "preload.js"
          ),

        nodeIntegration: false,

        contextIsolation: true,

        sandbox: true,

        devTools: false,
      },
    });

  mainWindow.setMenu(null);

  mainWindow.setMenuBarVisibility(
    false
  );

  mainWindow.setFullScreen(
    true
  );

  mainWindow.setKiosk(true);

  mainWindow.setAlwaysOnTop(
    true,
    "screen-saver"
  );

  mainWindow.loadURL(
    EXAM_URL
  );

  mainWindow.webContents.setWindowOpenHandler(
    () => ({
      action: "deny",
    })
  );

  mainWindow.webContents.on(
    "before-input-event",
    (event, input) => {
      const key =
        input.key.toLowerCase();

      const blocked =
        input.key === "F12" ||
        input.key === "F11" ||

        (
          input.control &&
          input.shift &&
          key === "i"
        ) ||

        (
          input.control &&
          input.shift &&
          key === "j"
        ) ||

        (
          input.control &&
          key === "u"
        ) ||

        (
          input.control &&
          key === "s"
        ) ||

        (
          input.alt &&
          key === "f4"
        );

      if (blocked) {
        event.preventDefault();
      }
    }
  );

  mainWindow.on(
    "closed",
    () => {
      mainWindow = null;
    }
  );
}

ipcMain.on(
  "exam-violation",
  (event, type) => {
    console.log(
      "EXAM VIOLATION:",
      type
    );
  }
);

app.whenReady().then(() => {

  globalShortcut.register(
    "CommandOrControl+Shift+I",
    () => {}
  );

  globalShortcut.register(
    "CommandOrControl+Shift+J",
    () => {}
  );

  globalShortcut.register(
    "F12",
    () => {}
  );

  globalShortcut.register(
    "F11",
    () => {}
  );

  createWindow();

  startKeyboardBlocker();
});

app.on(
  "will-quit",
  () => {
    stopKeyboardBlocker();

    globalShortcut.unregisterAll();
  }
);