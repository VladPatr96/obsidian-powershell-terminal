"use strict";
/**
 * Copyright (c) 2020, Microsoft Corporation (MIT License).
 * Patched for Obsidian: Worker threads are not available in Obsidian's renderer.
 *
 * We call the onReady listener immediately (synchronously) so that
 * connectSocket() is called before fs.openSync(term.conin) runs.
 * This avoids the deadlock where ConPTY waits for the output pipe to
 * be connected before allowing the input pipe to be opened.
 *
 * Trade-off: rare deadlock on PTY close when data is being written —
 * acceptable for interactive terminal use.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConoutConnection = void 0;

var ConoutConnection = /** @class */ (function () {
    function ConoutConnection(_conoutPipeName, _useConptyDll) {
        this._conoutPipeName = _conoutPipeName;
        this._useConptyDll = _useConptyDll;
        this._isDisposed = false;
    }
    Object.defineProperty(ConoutConnection.prototype, "onReady", {
        get: function () {
            var _this = this;
            // Call the listener immediately (synchronously) so connectSocket()
            // runs before windowsPtyAgent.js calls fs.openSync(term.conin)
            return function (listener) {
                listener();
            };
        },
        enumerable: false,
        configurable: true
    });
    ConoutConnection.prototype.connectSocket = function (socket) {
        // Connect directly to the ConPTY output pipe — no Worker intermediary
        socket.connect(this._conoutPipeName);
    };
    ConoutConnection.prototype.dispose = function () {
        this._isDisposed = true;
    };
    return ConoutConnection;
}());
exports.ConoutConnection = ConoutConnection;
//# sourceMappingURL=windowsConoutConnection.js.map
