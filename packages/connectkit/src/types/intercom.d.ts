interface IntercomCommand {
  (command: 'boot', options: IntercomSettings): void;
  (command: 'update', options?: IntercomSettings): void;
  (command: 'shutdown'): void;
  (command: 'hide'): void;
  (command: 'show'): void;
  (command: string, ...args: any[]): void;
}

interface IntercomSettings {
  app_id: string;
  name?: string;
  email?: string;
  user_id?: string;
  created_at?: number;
  hide_default_launcher?: boolean;
  [key: string]: any;
}

interface Window {
  Intercom: IntercomCommand;
}
