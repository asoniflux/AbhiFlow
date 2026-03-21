import Cocoa

// Tiny helper that monitors the Fn (Globe) key on macOS.
// Outputs "down" when Fn is pressed and "up" when released, one per line.
// Electron spawns this as a child process and reads stdout.

let fnFlag = NSEvent.ModifierFlags.function

var fnDown = false

// Global monitor for flagsChanged events (works even when app is not focused)
NSEvent.addGlobalMonitorForEvents(matching: .flagsChanged) { event in
    let isPressed = event.modifierFlags.contains(fnFlag)
    if isPressed && !fnDown {
        fnDown = true
        print("down", terminator: "\n")
        fflush(stdout)
    } else if !isPressed && fnDown {
        fnDown = false
        print("up", terminator: "\n")
        fflush(stdout)
    }
}

// Also monitor local events (when our process has focus, if ever)
NSEvent.addLocalMonitorForEvents(matching: .flagsChanged) { event in
    let isPressed = event.modifierFlags.contains(fnFlag)
    if isPressed && !fnDown {
        fnDown = true
        print("down", terminator: "\n")
        fflush(stdout)
    } else if !isPressed && fnDown {
        fnDown = false
        print("up", terminator: "\n")
        fflush(stdout)
    }
    return event
}

// Signal readiness
print("ready", terminator: "\n")
fflush(stdout)

// Run the event loop forever
RunLoop.current.run()
