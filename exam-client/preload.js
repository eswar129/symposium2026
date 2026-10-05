const {
  contextBridge,
  ipcRenderer,
} = require("electron");

contextBridge.exposeInMainWorld(
  "examClient",
  {
    isExamClient: true,

    reportViolation: (type) => {
      ipcRenderer.send(
        "exam-violation",
        type
      );
    },
  }
);