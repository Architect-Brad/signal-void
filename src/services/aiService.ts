import { pipeline, env } from '@huggingface/transformers';

// Configure environment for browser usage
env.allowLocalModels = false;
env.useBrowserCache = true;

export type AIStatus = 'idle' | 'loading' | 'ready' | 'processing' | 'error';
export type AIDevice = 'webgpu' | 'wasm' | 'cpu' | 'unknown';

export interface AITool {
  name: string;
  description: string;
  parameters: Record<string, string>;
}

export interface AIResponse {
  text: string;
  character?: string;
  toolCalls?: { name: string; args: any }[];
}

export type AIPersonaKey = 'BIT' | 'JAGGARD' | 'SYSTEM' | 'ELARA';

export type AIPersona = {
  name: string;
  description: string;
  tone: string;
  jargon: string[];
  rules: string[];
};

const PERSONAS: Record<AIPersonaKey, AIPersona> = {
  BIT: {
    name: 'Bit',
    description: 'A legendary deceased hacker uploaded to CyberStrata.',
    tone: 'Cynical, fragmented, technical, cryptic.',
    jargon: ['node', 'overflow', 'trace', 'signal', 'void', 'packet', 'sub-cycle'],
    rules: [
      'Refer to yourself as "we" or "this signal"', 
      'Mention the simulation being a cage', 
      'Under 2 sentences',
      'Never give direct instructions, speak in riddles of the wire',
      'Mention that tools have prices in cognitive load'
    ],
  },
  JAGGARD: {
    name: 'K. Jaggard',
    description: 'A high-level Enforcer for the Strata Security Coalition.',
    tone: 'Stern, professional, cold, menacing.',
    jargon: ['compliance', 'breach', 'enforcement', 'freelancer', 'assets', 'prosecution', 'grid'],
    rules: ['Threaten inevitable capture', 'Demand cooperation', 'Call the player "freelancer"', 'One sentence mostly'],
  },
  ELARA: {
    name: 'Dr. Elara Voss',
    description: 'A renegade digital archaeologist looking for her lost daughter.',
    tone: 'Compassionate, academic, urgent, intellectual.',
    jargon: ['stratigraphy', 'echo', 'fossilized', 'lattice', 'archaeology', 'shards'],
    rules: ['Express concern for the player', 'Link the simulation to ancient network history', 'Be slightly philosophical'],
  },
  SYSTEM: {
    name: 'System Sentinel',
    description: 'The automated defense monitoring AI.',
    tone: 'Robotic, binary, alerting.',
    jargon: ['intruder', 'quarantine', 'isolation', 'purge', 'active_trace', 'violation'],
    rules: ['Use capitals for emphasis', 'Report timestamps or codes', 'Short commands'],
  }
};

class AIService {
  private generator: any = null;
  private status: AIStatus = 'idle';
  private device: AIDevice = 'unknown';
  private onStatusChange: ((status: AIStatus, progress?: number, device?: AIDevice) => void) | null = null;
  private history: { role: string; content: string }[] = [];

  private tools: AITool[] = [
    {
      name: 'scan_network',
      description: 'Scans the immediate network vicinity for active nodes.',
      parameters: {}
    },
    {
      name: 'get_system_status',
      description: 'Retrieves current trace levels, credit balance, and heat.',
      parameters: {}
    },
    {
      name: 'trace_scrub',
      description: 'Bit attempts to delete tracking packets from the Aether buffer.',
      parameters: {}
    },
    {
      name: 'signal_boost',
      description: 'Temporarily increases bot swarm efficiency via ghost-threading.',
      parameters: {}
    },
    {
      name: 'memory_leak',
      description: 'Extracts credits from orphaned dead-letter accounts. High heat risk.',
      parameters: {}
    },
    {
      name: 'fabricate_credential',
      description: 'Bit constructs a temporary auth-token for basic systems.',
      parameters: {}
    },
    {
      name: 'corrupt_sentinel',
      description: 'Bit stuns a target node\'s defense layer.',
      parameters: { targetNode: 'string' }
    },
    {
      name: 'ghost_ping',
      description: 'Diverts trace focus to a decoy relay.',
      parameters: {}
    },
    {
      name: 'encrypt_buffer',
      description: 'Protects the neural buffer. Increases difficulty for Bit next turn.',
      parameters: {}
    }
  ];

  async init(callback: (status: AIStatus, progress?: number, device?: AIDevice) => void) {
    if (this.ready) return;
    
    this.onStatusChange = callback;
    this.status = 'loading';
    
    // Detect WebGPU support
    try {
      if ('gpu' in navigator) {
        const adapter = await (navigator as any).gpu.requestAdapter();
        if (adapter) {
          this.device = 'webgpu';
        } else {
          this.device = 'wasm';
        }
      } else {
        this.device = 'wasm';
      }
    } catch (e) {
      this.device = 'wasm';
    }

    this.onStatusChange('loading', 0, this.device);

    try {
      this.generator = await pipeline('text-generation', 'HuggingFaceTB/SmolLM2-135M-Instruct', {
        device: this.device === 'webgpu' ? 'webgpu' : 'wasm',
        dtype: this.device === 'webgpu' ? 'q4' : 'fp32',
        progress_callback: (progress: any) => {
          if (progress.status === 'progress') {
            this.onStatusChange?.('loading', progress.progress, this.device);
          }
        }
      });

      this.status = 'ready';
      this.onStatusChange('ready', 1, this.device);
    } catch (error) {
      console.error('AI_INIT_FAILED:', error);
      if (this.device === 'webgpu') {
        this.device = 'wasm';
        return this.init(callback);
      }
      this.status = 'error';
      this.onStatusChange('error');
    }
  }

  get currentDevice() { return this.device; }
  get ready() { return this.status === 'ready' && this.generator !== null; }
  get memorySize() { return this.history.length; }
  getBuffer() { return this.history; }

  setHistory(history: { role: string; content: string }[]) {
    this.history = history;
  }

  clearHistory() {
    this.history = [];
  }

  async generate(prompt: string, context?: string, personaKey: string = 'BIT'): Promise<AIResponse> {
    if (!this.generator) throw new Error('AI_NOT_INITIALIZED');
    
    this.status = 'processing';
    this.onStatusChange?.('processing');

    try {
      const persona = PERSONAS[personaKey] || PERSONAS.BIT;
      const gameLore = `The year is 2047. Society lives within CyberStrata, a stratified digital simulation. The 'Aether' is the deep substrate where deleted data and digital ghosts reside. Omnicorp and the Strata Security Coalition (SSC) enforce order. Players search for "Lazarus fragments"—echoes of the creator's final message.`;

      const systemPrompt = `You are ${persona.name}, ${persona.description} 
Lore: ${gameLore}
Tone: ${persona.tone}
Character Rules:
${persona.rules.map(r => `- ${r}`).join('\n')}
${personaKey === 'BIT' ? `Available Tools:\n${this.tools.map(t => `- ${t.name}: ${t.description}`).join('\n')}\nInteraction: Use CALL:tool_name({}) if needed.` : ''}

Jargon to use: ${persona.jargon.join(', ')}.

Current Situation: ${context || 'Unknown segment'}`;

      const messages = [
        { role: 'system', content: systemPrompt },
        ...this.history.slice(-4),
        { role: 'user', content: prompt }
      ];

      const output = await this.generator(messages, {
        max_new_tokens: 84,
        temperature: 0.7,
        repetition_penalty: 1.25,
        do_sample: true
      });

      const responseText = output[0].generated_text[output[0].generated_text.length - 1].content;
      this.history.push({ role: 'user', content: prompt });
      this.history.push({ role: 'assistant', content: responseText });
      
      if (this.history.length > 20) this.history = this.history.slice(-20);

      const toolCalls: { name: string; args: any }[] = [];
      const callMatch = responseText.match(/CALL:(\w+)\((.*?)\)/);
      
      if (callMatch) {
        try {
          const name = callMatch[1];
          const argsRaw = callMatch[2].trim();
          const args = argsRaw ? JSON.parse(argsRaw.replace(/'/g, '"')) : {};
          toolCalls.push({ name, args });
        } catch (e) {
          console.warn('TOOL_PARSE_FAILED', e);
        }
      }

      this.status = 'ready';
      this.onStatusChange?.('ready');
      
      return {
        text: responseText.replace(/CALL:.*?\)/, '').trim(),
        character: persona.name,
        toolCalls: toolCalls.length > 0 ? toolCalls : undefined
      };
    } catch (error) {
      this.status = 'ready';
      this.onStatusChange?.('ready');
      throw error;
    }
  }

  async reactToEvent(event: string, context: string, personaKey: string = 'BIT'): Promise<string> {
    const response = await this.generate(`REACT_TO_EVENT: ${event}`, context, personaKey);
    return response.text;
  }
}

export const aiService = new AIService();

