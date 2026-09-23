import { pluginSystem, Plugin } from '../core/plugins/pluginSystem';
import { realtime } from '../core/collaboration/realtime';

export class CollaborationPlugin implements Plugin {
  id = 'realtime-collab';
  name = 'Real-time Collaboration Layer';
  version = '1.0';

  async onRealityBranch(context: any) {
    realtime.broadcast('REALITY_BRANCHED', context);
  }
}

pluginSystem.register(new CollaborationPlugin());
