/*
 * Per-user Avro dictionary.
 *
 * The system dictionary is intentionally read-only.  Personal additions live
 * below XDG_CONFIG_HOME so they remain private to the desktop user and are
 * never touched by package upgrades or removal.
 * SPDX-License-Identifier: MPL-2.0
 */

const Gio = imports.gi.Gio;
const GLib = imports.gi.GLib;

function UserDictionary() {
    this._entries = {};
    this._loadedMtime = null;
    this.reload();
}

UserDictionary.prototype = {
    _file: function () {
        return Gio.File.new_for_path(GLib.get_user_config_dir() + '/avro/user-dictionary.json');
    },

    _normaliseKey: function (key) {
        return String(key || '').trim().toLowerCase();
    },

    _validEntry: function (key, value) {
        return key.length > 0 && key.length <= 128 &&
            typeof value === 'string' && value.trim().length > 0 && value.length <= 256;
    },

    _mtime: function (file) {
        try {
            return file.query_info('time::modified', Gio.FileQueryInfoFlags.NONE, null)
                .get_attribute_uint64('time::modified');
        } catch (e) {
            return null;
        }
    },

    reload: function () {
        let file = this._file();
        let entries = {};
        try {
            if (file.query_exists(null)) {
                let [ok, contents] = file.load_contents(null);
                let parsed = ok ? JSON.parse(new TextDecoder('utf-8').decode(contents)) : {};
                if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
                    for (let rawKey in parsed) {
                        let key = this._normaliseKey(rawKey);
                        let values = Array.isArray(parsed[rawKey]) ? parsed[rawKey] : [parsed[rawKey]];
                        for (let value of values) {
                            if (this._validEntry(key, value)) {
                                if (!entries[key]) entries[key] = [];
                                if (entries[key].indexOf(value.trim()) === -1) entries[key].push(value.trim());
                            }
                        }
                    }
                }
            }
        } catch (e) {
            // A malformed personal file must never prevent the input engine starting.
            entries = {};
        }
        this._entries = entries;
        this._loadedMtime = this._mtime(file);
    },

    _reloadIfChanged: function () {
        let mtime = this._mtime(this._file());
        if (mtime !== this._loadedMtime) this.reload();
    },

    get: function (key) {
        this._reloadIfChanged();
        let entries = this._entries[this._normaliseKey(key)] || [];
        return entries.slice();
    },

    add: function (key, value) {
        key = this._normaliseKey(key);
        value = String(value || '').trim();
        if (!this._validEntry(key, value)) return false;
        if (!this._entries[key]) this._entries[key] = [];
        if (this._entries[key].indexOf(value) === -1) this._entries[key].push(value);
        return this.save();
    },

    remove: function (key, value) {
        key = this._normaliseKey(key);
        value = String(value || '').trim();
        if (!this._entries[key]) return false;
        this._entries[key] = this._entries[key].filter(item => item !== value);
        if (this._entries[key].length === 0) delete this._entries[key];
        return this.save();
    },

    save: function () {
        try {
            let file = this._file();
            let parent = file.get_parent();
            if (!parent.query_exists(null)) parent.make_directory_with_parents(null);
            let bytes = new TextEncoder().encode(JSON.stringify(this._entries, null, 2) + '\n');
            file.replace_contents(bytes, null, false, Gio.FileCreateFlags.REPLACE_DESTINATION, null);
            this._loadedMtime = this._mtime(file);
            return true;
        } catch (e) {
            return false;
        }
    }
};
