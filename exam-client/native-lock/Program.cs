using System;
using System.Diagnostics;
using System.Runtime.InteropServices;

class Program
{
    private const int WH_KEYBOARD_LL = 13;

    private const int WM_KEYDOWN = 0x0100;

    private const int WM_SYSKEYDOWN = 0x0104;

    private const int VK_ESCAPE = 0x1B;

    private const int VK_TAB = 0x09;

    private const int VK_LWIN = 0x5B;

    private const int VK_RWIN = 0x5C;

    private const int VK_F4 = 0x73;

    private static IntPtr hookId =
        IntPtr.Zero;

    private static LowLevelKeyboardProc proc =
        HookCallback;

    static void Main()
    {
        hookId = SetHook(proc);

        Console.WriteLine(
            "MPR EXAM KEYBOARD LOCKDOWN ACTIVE"
        );

        Console.WriteLine(
            "Escape / Alt+Tab / Win+Tab / Windows key blocked."
        );

        MSG msg;

        while (
            GetMessage(
                out msg,
                IntPtr.Zero,
                0,
                0
            ) > 0
        )
        {
            TranslateMessage(
                ref msg
            );

            DispatchMessage(
                ref msg
            );
        }

        UnhookWindowsHookEx(
            hookId
        );
    }

    private static IntPtr SetHook(
        LowLevelKeyboardProc proc
    )
    {
        using Process currentProcess =
            Process.GetCurrentProcess();

        using ProcessModule? currentModule =
            currentProcess.MainModule;

        return SetWindowsHookEx(
            WH_KEYBOARD_LL,
            proc,
            GetModuleHandle(
                currentModule!.ModuleName
            ),
            0
        );
    }

    private static IntPtr HookCallback(
        int nCode,
        IntPtr wParam,
        IntPtr lParam
    )
    {
        if (nCode >= 0)
        {
            int vkCode =
                Marshal.ReadInt32(
                    lParam
                );

            bool keyDown =
                wParam ==
                    (IntPtr)WM_KEYDOWN ||
                wParam ==
                    (IntPtr)WM_SYSKEYDOWN;

            if (keyDown)
            {
                bool altPressed =
                    (
                        GetAsyncKeyState(
                            0x12
                        ) & 0x8000
                    ) != 0;

                bool winPressed =
                    (
                        GetAsyncKeyState(
                            VK_LWIN
                        ) & 0x8000
                    ) != 0
                    ||
                    (
                        GetAsyncKeyState(
                            VK_RWIN
                        ) & 0x8000
                    ) != 0;

                // Escape
                if (
                    vkCode ==
                    VK_ESCAPE
                )
                {
                    return (IntPtr)1;
                }

                // Alt + Tab
                if (
                    vkCode ==
                        VK_TAB &&
                    altPressed
                )
                {
                    return (IntPtr)1;
                }

                // Windows + Tab
                if (
                    vkCode ==
                        VK_TAB &&
                    winPressed
                )
                {
                    return (IntPtr)1;
                }

                // Windows key
                if (
                    vkCode ==
                        VK_LWIN ||
                    vkCode ==
                        VK_RWIN
                )
                {
                    return (IntPtr)1;
                }

                // Alt + F4
                if (
                    vkCode ==
                        VK_F4 &&
                    altPressed
                )
                {
                    return (IntPtr)1;
                }
            }
        }

        return CallNextHookEx(
            hookId,
            nCode,
            wParam,
            lParam
        );
    }

    private delegate IntPtr
        LowLevelKeyboardProc(
            int nCode,
            IntPtr wParam,
            IntPtr lParam
        );

    [DllImport(
        "user32.dll",
        CharSet = CharSet.Auto,
        SetLastError = true
    )]
    private static extern IntPtr
        SetWindowsHookEx(
            int idHook,
            LowLevelKeyboardProc lpfn,
            IntPtr hMod,
            uint dwThreadId
        );

    [DllImport(
        "user32.dll",
        CharSet = CharSet.Auto,
        SetLastError = true
    )]
    [return: MarshalAs(
        UnmanagedType.Bool
    )]
    private static extern bool
        UnhookWindowsHookEx(
            IntPtr hhk
        );

    [DllImport(
        "user32.dll",
        CharSet = CharSet.Auto
    )]
    private static extern IntPtr
        CallNextHookEx(
            IntPtr hhk,
            int nCode,
            IntPtr wParam,
            IntPtr lParam
        );

    [DllImport(
        "kernel32.dll",
        CharSet = CharSet.Auto,
        SetLastError = true
    )]
    private static extern IntPtr
        GetModuleHandle(
            string? lpModuleName
        );

    [DllImport("user32.dll")]
    private static extern short
        GetAsyncKeyState(
            int vKey
        );

    [DllImport("user32.dll")]
    private static extern int
        GetMessage(
            out MSG lpMsg,
            IntPtr hWnd,
            uint wMsgFilterMin,
            uint wMsgFilterMax
        );

    [DllImport("user32.dll")]
    private static extern bool
        TranslateMessage(
            ref MSG lpMsg
        );

    [DllImport("user32.dll")]
    private static extern IntPtr
        DispatchMessage(
            ref MSG lpMsg
        );

    [StructLayout(
        LayoutKind.Sequential
    )]
    private struct MSG
    {
        public IntPtr hwnd;

        public uint message;

        public IntPtr wParam;

        public IntPtr lParam;

        public uint time;

        public POINT pt;
    }

    [StructLayout(
        LayoutKind.Sequential
    )]
    private struct POINT
    {
        public int x;

        public int y;
    }
}