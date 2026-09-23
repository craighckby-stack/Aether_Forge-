import './knowledgeGraph';
import './authPlugin';
import './collaborationPlugin';
import './distributedComputing';
import './testingPlugin';
import './deploymentPlugin';

import { pluginSystem } from '../core/plugins/pluginSystem';

// Automatically log registered plugins on load
console.log('AetherForge Ω: Global Genesis Plugins Loaded:', pluginSystem.listPlugins());
