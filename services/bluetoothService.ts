import { SERVICE_HEART_RATE, CHAR_HEART_RATE_MEASUREMENT } from '../constants';

// Web Bluetooth API Type Definitions
interface BluetoothRequestDeviceFilter {
  services?: (string | number)[];
  name?: string;
  namePrefix?: string;
  manufacturerData?: { companyIdentifier: number; dataPrefix?: BufferSource; mask?: BufferSource }[];
  serviceData?: { service: string | number; dataPrefix?: BufferSource; mask?: BufferSource }[];
}

interface RequestDeviceOptions {
  filters: BluetoothRequestDeviceFilter[];
  optionalServices?: (string | number)[];
  acceptAllDevices?: boolean;
}

interface BluetoothRemoteGATTCharacteristic extends EventTarget {
  value?: DataView;
  service: BluetoothRemoteGATTService;
  uuid: string;
  properties: {
    broadcast: boolean;
    read: boolean;
    writeWithoutResponse: boolean;
    write: boolean;
    notify: boolean;
    indicate: boolean;
    authenticatedSignedWrites: boolean;
    reliableWrite: boolean;
    writableAuxiliaries: boolean;
  };
  startNotifications(): Promise<BluetoothRemoteGATTCharacteristic>;
  stopNotifications(): Promise<BluetoothRemoteGATTCharacteristic>;
  readValue(): Promise<DataView>;
  writeValue(value: BufferSource): Promise<void>;
}

interface BluetoothRemoteGATTService extends EventTarget {
  device: BluetoothDevice;
  uuid: string;
  isPrimary: boolean;
  getCharacteristic(characteristic: string | number): Promise<BluetoothRemoteGATTCharacteristic>;
  getCharacteristics(characteristic?: string | number): Promise<BluetoothRemoteGATTCharacteristic[]>;
  getIncludedService(service: string | number): Promise<BluetoothRemoteGATTService>;
  getIncludedServices(service?: string | number): Promise<BluetoothRemoteGATTService[]>;
}

interface BluetoothRemoteGATTServer {
  device: BluetoothDevice;
  connected: boolean;
  connect(): Promise<BluetoothRemoteGATTServer>;
  disconnect(): void;
  getPrimaryService(service: string | number): Promise<BluetoothRemoteGATTService>;
  getPrimaryServices(service?: string | number): Promise<BluetoothRemoteGATTService[]>;
}

interface BluetoothDevice extends EventTarget {
  id: string;
  name?: string;
  gatt?: BluetoothRemoteGATTServer;
  watchAdvertisements(): Promise<void>;
  unwatchAdvertisements(): void;
  readonly watchingAdvertisements: boolean;
  addEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions): void;
  removeEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | EventListenerOptions): void;
}

interface Bluetooth extends EventTarget {
  getAvailability(): Promise<boolean>;
  requestDevice(options: RequestDeviceOptions): Promise<BluetoothDevice>;
}

declare global {
  interface Navigator {
    bluetooth: Bluetooth;
  }
}

type DataCallback = (hr: number, rrIntervals: number[]) => void;
type StatusCallback = (isConnected: boolean, error?: string) => void;

export class BluetoothMonitor {
  private device: BluetoothDevice | null = null;
  private server: BluetoothRemoteGATTServer | null = null;
  private onData: DataCallback;
  private onStatus: StatusCallback;

  constructor(onData: DataCallback, onStatus: StatusCallback) {
    this.onData = onData;
    this.onStatus = onStatus;
  }

  async connect() {
    try {
      this.device = await navigator.bluetooth.requestDevice({
        filters: [{ services: [SERVICE_HEART_RATE] }]
      });

      if (!this.device) {
        throw new Error("No device selected");
      }

      this.device.addEventListener('gattserverdisconnected', this.handleDisconnect);

      if (!this.device.gatt) {
        throw new Error("GATT not available on device");
      }

      this.server = await this.device.gatt.connect();
      const service = await this.server.getPrimaryService(SERVICE_HEART_RATE);
      const characteristic = await service.getCharacteristic(CHAR_HEART_RATE_MEASUREMENT);

      await characteristic.startNotifications();
      characteristic.addEventListener('characteristicvaluechanged', this.handleCharacteristicValueChanged);

      this.onStatus(true);
      console.log('Bluetooth connected');
    } catch (error: any) {
      console.error('Bluetooth error:', error);
      this.onStatus(false, error.message || 'Connection failed');
    }
  }

  disconnect() {
    if (this.device && this.device.gatt?.connected) {
      this.device.gatt.disconnect();
    }
  }

  private handleDisconnect = () => {
    console.log('Device disconnected');
    this.onStatus(false);
  }

  private handleCharacteristicValueChanged = (event: Event) => {
    const value = (event.target as BluetoothRemoteGATTCharacteristic).value;
    if (!value) return;
    this.parseHeartRate(value);
  }

  private parseHeartRate(data: DataView) {
    const flags = data.getUint8(0);
    const isUint16Measurement = (flags & 1) !== 0; // Bit 0
    const rrIntervalsPresent = (flags & 0x10) !== 0; // Bit 4

    let offset = 1;
    let heartRate = 0;

    if (isUint16Measurement) {
      heartRate = data.getUint16(offset, true); // Little endian
      offset += 2;
    } else {
      heartRate = data.getUint8(offset);
      offset += 1;
    }

    // Skip Energy Expended if present (Bit 3)
    const energyExpendedPresent = (flags & 0x08) !== 0;
    if (energyExpendedPresent) {
      offset += 2;
    }

    const rrIntervals: number[] = [];
    if (rrIntervalsPresent) {
      // Remaining bytes are RR intervals
      while (offset < data.byteLength) {
        const rrRaw = data.getUint16(offset, true);
        // Unit is 1/1024 seconds. Convert to ms.
        const rrMs = (rrRaw / 1024) * 1000;
        rrIntervals.push(rrMs);
        offset += 2;
      }
    }

    this.onData(heartRate, rrIntervals);
  }
}