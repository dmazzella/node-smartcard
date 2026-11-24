import { scard as native } from "./low-level/index.ts";

export const Scope = Object.freeze({ User: native.SCARD_SCOPE_USER, Terminal: native.SCARD_SCOPE_TERMINAL, System: native.SCARD_SCOPE_SYSTEM });
export const Share = Object.freeze({ Exclusive: native.SCARD_SHARE_EXCLUSIVE, Shared: native.SCARD_SHARE_SHARED, Direct: native.SCARD_SHARE_DIRECT });
export const Protocol = Object.freeze({ T0: native.SCARD_PROTOCOL_T0, T1: native.SCARD_PROTOCOL_T1, Tx: native.SCARD_PROTOCOL_ANY, Raw: native.SCARD_PROTOCOL_RAW, Undefined: native.SCARD_PROTOCOL_UNDEFINED });
export const Disposition = Object.freeze({ LeaveCard: native.SCARD_LEAVE_CARD, ResetCard: native.SCARD_RESET_CARD, UnpowerCard: native.SCARD_UNPOWER_CARD, EjectCard: native.SCARD_EJECT_CARD });
export const State = Object.freeze({
  Unaware: native.SCARD_STATE_UNAWARE,
  Ignore: native.SCARD_STATE_IGNORE,
  Changed: native.SCARD_STATE_CHANGED,
  Unknown: native.SCARD_STATE_UNKNOWN,
  Unavailable: native.SCARD_STATE_UNAVAILABLE,
  Empty: native.SCARD_STATE_EMPTY,
  Present: native.SCARD_STATE_PRESENT,
  Atrmatch: native.SCARD_STATE_ATRMATCH,
  Exclusive: native.SCARD_STATE_EXCLUSIVE,
  Inuse: native.SCARD_STATE_INUSE,
  Mute: native.SCARD_STATE_MUTE,
  Unpowered: native.SCARD_STATE_UNPOWERED,
});
export const Attribute = Object.freeze({
  VendorName: native.SCARD_ATTR_VENDOR_NAME,
  VendorIfdType: native.SCARD_ATTR_VENDOR_IFD_TYPE,
  VendorIfdVersion: native.SCARD_ATTR_VENDOR_IFD_VERSION,
  VendorIfdSerialNo: native.SCARD_ATTR_VENDOR_IFD_SERIAL_NO,
  ChannelId: native.SCARD_ATTR_CHANNEL_ID,
  ProtocolTypes: native.SCARD_ATTR_PROTOCOL_TYPES,
  DefaultClk: native.SCARD_ATTR_DEFAULT_CLK,
  MaxClk: native.SCARD_ATTR_MAX_CLK,
  DefaultDataRate: native.SCARD_ATTR_DEFAULT_DATA_RATE,
  MaxDataRate: native.SCARD_ATTR_MAX_DATA_RATE,
  MaxIfsd: native.SCARD_ATTR_MAX_IFSD,
  PowerMgmtSupport: native.SCARD_ATTR_POWER_MGMT_SUPPORT,
  UserToCardAuthDevice: native.SCARD_ATTR_USER_TO_CARD_AUTH_DEVICE,
  UserAuthInputDevice: native.SCARD_ATTR_USER_AUTH_INPUT_DEVICE,
  Characteristics: native.SCARD_ATTR_CHARACTERISTICS,
  CurrentProtocolType: native.SCARD_ATTR_CURRENT_PROTOCOL_TYPE,
  CurrentClk: native.SCARD_ATTR_CURRENT_CLK,
  CurrentF: native.SCARD_ATTR_CURRENT_F,
  CurrentD: native.SCARD_ATTR_CURRENT_D,
  CurrentN: native.SCARD_ATTR_CURRENT_N,
  CurrentW: native.SCARD_ATTR_CURRENT_W,
  CurrentIfsc: native.SCARD_ATTR_CURRENT_IFSC,
  CurrentIfsd: native.SCARD_ATTR_CURRENT_IFSD,
  CurrentBwt: native.SCARD_ATTR_CURRENT_BWT,
  CurrentCwt: native.SCARD_ATTR_CURRENT_CWT,
  CurrentEbcEncoding: native.SCARD_ATTR_CURRENT_EBC_ENCODING,
  ExtendedBwt: native.SCARD_ATTR_EXTENDED_BWT,
  IccPresence: native.SCARD_ATTR_ICC_PRESENCE,
  IccInterfaceStatus: native.SCARD_ATTR_ICC_INTERFACE_STATUS,
  CurrentIoState: native.SCARD_ATTR_CURRENT_IO_STATE,
  AtrString: native.SCARD_ATTR_ATR_STRING,
  IccTypePerAtr: native.SCARD_ATTR_ICC_TYPE_PER_ATR,
  EscReset: native.SCARD_ATTR_ESC_RESET,
  EscCancel: native.SCARD_ATTR_ESC_CANCEL,
  EscAuthRequest: native.SCARD_ATTR_ESC_AUTHREQUEST,
  MaxInput: native.SCARD_ATTR_MAXINPUT,
  VendorSpecificInfo: 0x0007a008,
  DeviceUnit: native.SCARD_ATTR_DEVICE_UNIT,
  DeviceInUse: native.SCARD_ATTR_DEVICE_IN_USE,
  DeviceFriendlyName: native.SCARD_ATTR_DEVICE_FRIENDLY_NAME_A,
  DeviceSystemName: native.SCARD_ATTR_DEVICE_SYSTEM_NAME_A,
  SupressT1IfsRequest: native.SCARD_ATTR_SUPRESS_T1_IFS_REQUEST,
  PerfNumTransmissions: 0x7ffe0001,
  PerfBytesTransmitted: 0x7ffe0002,
  PerfTransmissionTime: 0x7ffe0003,
});

const STATE_BITS: ReadonlyArray<readonly [string, number]> = Object.entries(State).filter(([, bit]) => bit !== 0);
const PROTOCOL_NAMES = new Map<number, string>([[Protocol.Tx, "T0|T1"], ...Object.entries(Protocol).map(([name, bit]) => [bit, name] as const)]);

export function stateName(value: number): string {
  const names: string[] = [];
  for (const [name, bit] of STATE_BITS) if ((value & bit) !== 0) names.push(name);
  return names.join("|");
}
export function protocolName(value: number): string {
  return PROTOCOL_NAMES.get(value) ?? "";
}
