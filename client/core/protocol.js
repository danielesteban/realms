/* eslint-disable */
import $protobuf from './protobuf.js';

const $Reader = $protobuf.Reader, $Writer = $protobuf.Writer, $util = $protobuf.util;

const $root = $protobuf.roots["default"] || ($protobuf.roots["default"] = {});

export const protocol = $root.protocol = (() => {

    const protocol = {};

    protocol.Message = (function() {

        function Message(properties) {
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        Message.prototype.type = 1;
        Message.prototype.buffer = $util.newBuffer([]);
        Message.prototype.json = "";

        Message.create = function create(properties) {
            return new Message(properties);
        };

        Message.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.type != null && Object.hasOwnProperty.call(message, "type"))
                writer.uint32(8).int32(message.type);
            if (message.buffer != null && Object.hasOwnProperty.call(message, "buffer"))
                writer.uint32(18).bytes(message.buffer);
            if (message.json != null && Object.hasOwnProperty.call(message, "json"))
                writer.uint32(26).string(message.json);
            return writer;
        };

        Message.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        Message.decode = function decode(reader, length) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.protocol.Message();
            while (reader.pos < end) {
                let tag = reader.uint32();
                switch (tag >>> 3) {
                case 1:
                    message.type = reader.int32();
                    break;
                case 2:
                    message.buffer = reader.bytes();
                    break;
                case 3:
                    message.json = reader.string();
                    break;
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        Message.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        Message.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.type != null && message.hasOwnProperty("type"))
                switch (message.type) {
                default:
                    return "type: enum value expected";
                case 1:
                case 2:
                case 3:
                case 4:
                case 5:
                case 6:
                case 7:
                case 8:
                    break;
                }
            if (message.buffer != null && message.hasOwnProperty("buffer"))
                if (!(message.buffer && typeof message.buffer.length === "number" || $util.isString(message.buffer)))
                    return "buffer: buffer expected";
            if (message.json != null && message.hasOwnProperty("json"))
                if (!$util.isString(message.json))
                    return "json: string expected";
            return null;
        };

        Message.fromObject = function fromObject(object) {
            if (object instanceof $root.protocol.Message)
                return object;
            let message = new $root.protocol.Message();
            switch (object.type) {
            case "ALLOW":
            case 1:
                message.type = 1;
                break;
            case "ERROR":
            case 2:
                message.type = 2;
                break;
            case "INIT":
            case 3:
                message.type = 3;
                break;
            case "JOIN":
            case 4:
                message.type = 4;
                break;
            case "LEAVE":
            case 5:
                message.type = 5;
                break;
            case "META":
            case 6:
                message.type = 6;
                break;
            case "SIGNAL":
            case 7:
                message.type = 7;
                break;
            case "VOXEL":
            case 8:
                message.type = 8;
                break;
            }
            if (object.buffer != null)
                if (typeof object.buffer === "string")
                    $util.base64.decode(object.buffer, message.buffer = $util.newBuffer($util.base64.length(object.buffer)), 0);
                else if (object.buffer.length)
                    message.buffer = object.buffer;
            if (object.json != null)
                message.json = String(object.json);
            return message;
        };

        Message.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            let object = {};
            if (options.defaults) {
                object.type = options.enums === String ? "ALLOW" : 1;
                if (options.bytes === String)
                    object.buffer = "";
                else {
                    object.buffer = [];
                    if (options.bytes !== Array)
                        object.buffer = $util.newBuffer(object.buffer);
                }
                object.json = "";
            }
            if (message.type != null && message.hasOwnProperty("type"))
                object.type = options.enums === String ? $root.protocol.Message.Type[message.type] : message.type;
            if (message.buffer != null && message.hasOwnProperty("buffer"))
                object.buffer = options.bytes === String ? $util.base64.encode(message.buffer, 0, message.buffer.length) : options.bytes === Array ? Array.prototype.slice.call(message.buffer) : message.buffer;
            if (message.json != null && message.hasOwnProperty("json"))
                object.json = message.json;
            return object;
        };

        Message.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        Message.Type = (function() {
            const valuesById = {}, values = Object.create(valuesById);
            values[valuesById[1] = "ALLOW"] = 1;
            values[valuesById[2] = "ERROR"] = 2;
            values[valuesById[3] = "INIT"] = 3;
            values[valuesById[4] = "JOIN"] = 4;
            values[valuesById[5] = "LEAVE"] = 5;
            values[valuesById[6] = "META"] = 6;
            values[valuesById[7] = "SIGNAL"] = 7;
            values[valuesById[8] = "VOXEL"] = 8;
            return values;
        })();

        return Message;
    })();

    return protocol;
})();

export { $root as default };
