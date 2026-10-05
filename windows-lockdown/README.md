# MPR Exam Windows Lockdown

MPR Exam uses three security layers:

1. React exam security
2. Electron kiosk window
3. Windows OS-level lockdown

React can handle browser/page-level shortcuts.

Electron provides the dedicated exam window.

Windows Keyboard Filter / kiosk policies provide OS-level
restrictions where supported.

Important:

Alt + Tab
Windows + Tab
Escape
Alt + F4

cannot be reliably controlled by React alone.

Ctrl + Alt + Delete is a Windows Secure Attention Sequence
and cannot be blocked by a normal application keyboard hook.

Test the complete configuration on the exact Windows edition
and version used by the examination machines.