/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Terminal as TerminalIcon, 
  Cpu, 
  Network, 
  Files as FilesIcon, 
  ShieldAlert, 
  Lock, 
  Unlock, 
  Zap,
  HardDrive,
  Info,
  Server,
  Box,
  Mail as MailIcon,
  ChevronRight,
  Folder,
  File,
  Mail,
  Paperclip,
  Globe,
  ArrowLeft,
  ArrowRight,
  Home,
  Archive,
  Heart,
  Share2,
  ShieldCheck,
  BookOpen,
  Cloud,
  Play,
  Plus,
  Activity,
  Search,
  X as XIcon,
  Calendar,
  Settings2,
  HelpCircle,
  X,
  LogIn,
  LogOut,
  RefreshCw,
  CloudCheck,
  Shield,
  Users,
  DollarSign,
  Briefcase,
  Rss,
  Book,
  Target,
  Eye,
  Code,
  ShieldOff,
  Ghost,
  Volume2,
  VolumeX,
  Fingerprint
} from 'lucide-react';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  signOut,
  User
} from 'firebase/auth';
import { aiService, AIStatus, AIDevice, AIPersonaKey } from './services/aiService';
import { 
  doc, 
  setDoc, 
  getDoc, 
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  limit,
  serverTimestamp,
  getDocFromServer
} from 'firebase/firestore';
import { auth, db } from './firebase';

// --- TYPES ---
type PortStatus = {
  number: number;
  service: string;
  isBroken: boolean;
};

type VirtualFile = {
  name: string;
  content?: string;
  type: 'file' | 'dir';
  children?: VirtualFile[];
  size?: number; // Size in MB
};

type ToolMeta = {
  id: string;
  name: string;
  description: string;
  ramReq: number; // RAM requirement in MB
  diskReq: number; // Disk space in GB
  price: number;
  type: 'crack' | 'utility' | 'stealth' | 'malicious';
  storyUse: 'essential' | 'useful' | 'optional' | 'sandbox';
};

// --- UTILITIES ---
const formatStrataTime = (date: Date) => {
  return date.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
};

const formatStrataDate = (date: Date) => {
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: '2-digit' }).toUpperCase();
};

const TOOL_LIBRARY: Record<string, ToolMeta> = {
  'sshcrack.exe': { id: 'sshcrack', name: 'SSHCrack.exe', description: 'Breaks open SSH ports. Essential for early node access.', ramReq: 256, diskReq: 0.5, price: 100, type: 'crack', storyUse: 'essential' },
  'ftpbounce.exe': { id: 'ftpbounce', name: 'FTPBounce.exe', description: 'Standard FTP exploit tool. Required for Vektor file nodes.', ramReq: 300, diskReq: 0.8, price: 200, type: 'crack', storyUse: 'essential' },
  'webster.exe': { id: 'webster', name: 'Webster.exe', description: 'HTTP vulnerability scanner. Needed for web-facing repositories.', ramReq: 400, diskReq: 1.2, price: 500, type: 'crack', storyUse: 'essential' },
  'smtp_overload.exe': { id: 'smtp_overload', name: 'SMTPOverload.exe', description: 'Force debug mode on mail servers.', ramReq: 150, diskReq: 0.3, price: 150, type: 'crack', storyUse: 'useful' },
  'sql_inject.exe': { id: 'sql_inject', name: 'SQLInject.exe', description: 'Deep database breach tool.', ramReq: 500, diskReq: 2.0, price: 1200, type: 'crack', storyUse: 'useful' },
  'dns_spoof.exe': { id: 'dns_spoof', name: 'DNSSpoof.exe', description: 'Redirect traffic via DNS poisoning.', ramReq: 350, diskReq: 0.9, price: 800, type: 'crack', storyUse: 'optional' },
  'proxy_mask.exe': { id: 'proxy_mask', name: 'ProxyMask.exe', description: 'Passive stealth. Reduces trace speed by 20%.', ramReq: 200, diskReq: 1.5, price: 1000, type: 'stealth', storyUse: 'useful' },
  'shell_ghost.v2': { id: 'shell_ghost', name: 'ShellGhost.v2', description: 'Maintain persistent low-noise access.', ramReq: 300, diskReq: 1.0, price: 1500, type: 'stealth', storyUse: 'useful' },
  'trace_kill.exe': { id: 'trace_kill', name: 'TraceKill.exe', description: 'Emergency trace reset (Single use).', ramReq: 600, diskReq: 0.1, price: 3000, type: 'utility', storyUse: 'useful' },
  'ram_optimizer.exe': { id: 'ram_optimizer', name: 'RamOptimizer.exe', description: 'Reduces kernel RAM overhead.', ramReq: 0, diskReq: 0.5, price: 500, type: 'utility', storyUse: 'optional' },
  'decrypter.v3': { id: 'decrypter', name: 'Decrypter.v3', description: 'Required for high-level Lazarus encrypted logs.', ramReq: 450, diskReq: 1.8, price: 2000, type: 'utility', storyUse: 'essential' },
  'backdoor_gen.exe': { id: 'backdoor_gen', name: 'BackdoorGen.exe', description: 'Bypass re-cracking on subsequent visits.', ramReq: 300, diskReq: 2.5, price: 2500, type: 'crack', storyUse: 'optional' },
  'nmap_pro.exe': { id: 'nmap_pro', name: 'NMapPro.exe', description: 'Stealth mapping. Generates zero IDS noise.', ramReq: 100, diskReq: 0.4, price: 50, type: 'utility', storyUse: 'essential' },
  'grep_hardened.exe': { id: 'grep_hardened', name: 'GrepHardened.exe', description: 'Deep string analysis for password recovery.', ramReq: 50, diskReq: 0.2, price: 0, type: 'utility', storyUse: 'useful' },
  'bit_miner.exe': { id: 'bit_miner', name: 'BitMiner.exe', description: 'Passive credit generation. Very loud.', ramReq: 1024, diskReq: 5.0, price: 5000, type: 'malicious', storyUse: 'sandbox' },
  'logic_bomb.exe': { id: 'logic_bomb', name: 'LogicBomb.exe', description: 'Crash target node indefinitely.', ramReq: 800, diskReq: 0.5, price: 4500, type: 'malicious', storyUse: 'sandbox' },
  'sys_wiper.exe': { id: 'sys_wiper', name: 'SysWiper.exe', description: 'Delete all files on target node.', ramReq: 200, diskReq: 1.0, price: 3500, type: 'malicious', storyUse: 'sandbox' },
  'packet_sniffer.exe': { id: 'packet_sniffer', name: 'PacketSniffer.exe', description: 'Intercept cleartext communications.', ramReq: 300, diskReq: 0.7, price: 700, type: 'utility', storyUse: 'optional' },
  'ip_obfuscator.exe': { id: 'ip_obfuscator', name: 'IPObfuscator.exe', description: 'Makes you harder to find in scan results.', ramReq: 250, diskReq: 1.2, price: 900, type: 'stealth', storyUse: 'optional' },
  'kernel_bypass.exe': { id: 'kernel_bypass', name: 'KernelBypass.exe', description: 'Ignore admin permissions on target files.', ramReq: 900, diskReq: 3.5, price: 10000, type: 'crack', storyUse: 'useful' },
  'firewall_drain.exe': { id: 'firewall_drain', name: 'FirewallDrain.exe', description: 'Slowly disables target firewalls.', ramReq: 400, diskReq: 2.2, price: 1800, type: 'crack', storyUse: 'optional' },
  'proxy_chain.exe': { id: 'proxy_chain', name: 'ProxyChain.exe', description: 'Chain multiple relays for max stealth.', ramReq: 550, diskReq: 4.0, price: 5500, type: 'stealth', storyUse: 'optional' },
  'data_siphon.exe': { id: 'data_siphon', name: 'DataSiphon.exe', description: 'Automated remote data collection.', ramReq: 350, diskReq: 1.5, price: 1300, type: 'utility', storyUse: 'optional' },
  'root_kit.v5': { id: 'root_kit', name: 'RootKit.v5', description: 'Total system control module.', ramReq: 700, diskReq: 2.0, price: 8000, type: 'malicious', storyUse: 'sandbox' },
  'worm_spread.exe': { id: 'worm_spread', name: 'WormSpread.exe', description: 'Automatically infect nearby scanned nodes. Heavy RAM usage.', ramReq: 850, diskReq: 6.0, price: 12000, type: 'malicious', storyUse: 'sandbox' },
  'signal_jammer.exe': { id: 'signal_jammer.exe', name: 'SignalJammer.exe', description: 'Stops trace for 30 seconds.', ramReq: 400, diskReq: 1.0, price: 2500, type: 'stealth', storyUse: 'useful' },
  'entropy_shield.exe': { id: 'entropy_shield.exe', name: 'EntropyShield.exe', description: 'Passive protection against counter-hacks.', ramReq: 200, diskReq: 1.5, price: 2000, type: 'stealth', storyUse: 'useful' }
};

const TUTORIAL_STEPS = [
  {
    title: "PROLOGUE: THE_GHOST_IN_THE_WIRE",
    content: "The message arrived at 03:17 station time via seventeen dead relays. It is addressed to you by your real name: MARA_VOSS. A message from fourteen years ago... re-sent three hours ago.",
    action: "Press [ENTER] to ANALYZE_PACKET"
  },
  {
    title: "THE_LAZARUS_SIGNAL",
    content: "'They didn't wall off the net. They harvested it.' - Signed: LAZARUS. You are a signal archaeologist in the Undertow, picking through digital shipwrecks. This dead message is your first lead to a truth buried for a decade.",
    action: "Press [ENTER] to INITIALIZE_CORE"
  },
  {
    title: "THE_STRATIGRAPHY_OF_LIES",
    content: "The net didn't collapse in 2031; it was partitioned. Vektor Systems built the walls. Below the Domain layer lies the Undertow—lawless, ghost infrastructure where you live. Type 'help' at any time to initialize your tools.",
    action: "Press [ENTER] to ACCESS_COMMAND_LINE"
  },
  {
    title: "RESOURCE_MANAGEMENT",
    content: "Resource management is vital. Type 'btop' or 'htop' to launch the monitor. High CPU or MEM load increases your thermal signature, making you easier for the Continuity Protocol to model.",
    action: "Press [ENTER] to LEARN_OPSEC"
  },
  {
    title: "SIGNAL_NOISE_&_IDS",
    content: "Caution: Every network packet generates 'Signal Noise'. If your noise level exceeds 75%, automated SEC_OPS sentinels will trace your physical location. Stay low, stay quiet.",
    action: "Press [ENTER] to VIEW_MAP"
  },
  {
    title: "THE_LAZARUS_SHARDS",
    content: "Lazarus left 5 fragmented shards across high-security nodes. Use 'archaeology_scan' on remote targets to recover them. Once all are in your 'Archive', use 'decrypt_lazarus' to unveil the hidden reality.",
    action: "Press [ENTER] to BEGIN_EXCAVATION"
  }
];

type TerminalLog = {
  id: string;
  text: string;
  type: 'system' | 'error' | 'success' | 'warning' | 'info';
  isGhost?: boolean;
  timestamp: string;
};

type TerminalInstance = {
  id: string;
  log: (string | TerminalLog)[];
  inputValue: string;
  history: string[];
  historyIndex: number;
  isActive: boolean;
};

type ProgressJob = {
  id: string;
  label: string;
  progress: number; // 0 to 100
  color: string;
};

type WifiDevice = {
  id: string;
  name: string;
  type: 'workstation' | 'camera' | 'iot' | 'phone' | 'server';
  ip: string;
  mac: string;
  isVulnerable: boolean;
  exploit?: string;
};

type WifiNetwork = {
  ssid: string;
  security: 'WEP' | 'WPA2' | 'WPA3' | 'OPEN';
  signal: number;
  isLocked: boolean;
  password?: string;
  connectedNodeId: string;
  devices: WifiDevice[];
};

type InGameWebsite = {
  url: string;
  title: string;
  content: React.ReactNode;
  isRestricted: boolean;
};

type SocialComment = {
  id: string;
  user: string;
  message: string;
  timestamp: string;
};

type SocialPost = {
  id: string;
  author: string;
  content: string;
  timestamp: string;
  likes: number;
  tags: string[];
  comments?: SocialComment[];
};

type SocialChat = {
  id: string;
  user: string;
  message: string;
  timestamp: string;
  isSelf?: boolean;
};

type BotTask = 'MINING' | 'PROTECT' | 'SNIFFING';

type VirtualServer = {
  id: string;
  name: string;
  type: 'COMPUTE' | 'STORAGE' | 'PROXY';
  tier: 1 | 2 | 3;
  status: 'ONLINE' | 'OFFLINE' | 'MAINTENANCE';
  currentLoad: number;
  incomePerCycle: number;
  costPerCycle: number;
};

type Bot = {
  id: string;
  name: string;
  type: BotTask;
  targetNodeId: string;
  status: 'ACTIVE' | 'IDLE' | 'COMPROMISED';
  efficiency: number;
  deployedAt: number;
};

type ISPName = 'ROOT_STRATA' | 'TATA_COMMS' | 'LEVEL_3' | 'CYBER_DYNAMICS' | 'AETHER_ACCESS' | 'MESH_NET' | 'SEC_NET' | 'GLOBE_TRANSIT' | 'TATA_NET';

type ISPTier = 'BACKBONE' | 'TIER_1' | 'TIER_2' | 'TIER_3' | 'LEGACY';

type Node = {
  id: string;
  name: string;
  ip: string;
  files: VirtualFile[];
  ports: PortStatus[];
  color: string;
  x: number;
  y: number;
  isUnlocked: boolean;
  description: string;
  traceSpeed: number; // Base trace speed modifier (e.g., 0.1 to 1.0)
  backdoorInstalled?: boolean;
  isLeased?: boolean;
  os: string;
  kernel: string;
  uptime: string;
  sector?: string;
  impact?: string;
  logo?: string; // Icon identifier from lucide
  isIntercepted?: boolean;
  ispTier?: ISPTier;
  ispName?: string;
  patchLevel?: number;
  securityProtocol?: 'BLUE_SHIELD' | 'IRON_MAIDEN' | 'HYDRA_CORE' | 'VOID_PULSE' | 'GHOST_MASK' | 'CONTINUITY_V1' | 'LEGACY_VOID' | 'VOID_SHIELD_V4' | 'SMOOTH_SWIPE';
  lastPatched?: string;
  firewall?: {
    level: number;
    isActive: boolean;
    type: 'packet_filter' | 'stateful' | 'next_gen' | 'proxy';
  };
};

type Process = {
  id: string;
  name: string;
  progress: number;
  targetNodeId: string;
  portNumber?: number;
};

type StoryMessage = {
  id: string;
  from: string;
  subject: string;
  body: string;
  timestamp: string;
  isRead: boolean;
};

type Exploit = {
  id: string;
  name: string;
  description: string;
  targetProtocol: string;
  cost: number;
  tier: number;
  category: 'BUFFER_OVERFLOW' | 'SQL_INJECTION' | 'ZERO_DAY' | 'SOCIAL_ENGINEERING';
};

type Mission = {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  reward?: number;
  target?: string;
};

type ShopItem = {
  id: string;
  name: string;
  price: number;
  description: string;
  type: 'legit' | 'malicious';
};

const SHOP_ITEMS: ToolMeta[] = Object.values(TOOL_LIBRARY).filter(t => t.price > 0);

// --- DATA ---
const INITIAL_NODES: Record<string, Node> = {
  'home': { 
    id: 'home', 
    name: 'VOSS_SCOPE_STATION', 
    ip: '127.0.0.1', 
    os: 'UndertowOS v4.7 (Archaeology Kern)',
    kernel: 'LAZ-VOID-4.7',
    uptime: '3 days, 11h',
    sector: 'UNDERTOW',
    impact: 'A customized local environment for signal archaeology and packet restoration.',
    logo: 'HardDrive',
    ispTier: 'LEGACY',
    ispName: 'DARK_FIBER_MESH',
    files: [
      { name: 'bin', type: 'dir', children: [
        { name: 'scope_analyzer.exe', type: 'file', content: 'Utility: Search core.', size: 0.2 },
        { name: 'fingerprint.exe', type: 'file', content: 'System detection utility.', size: 0.1 }
      ] },
      { name: 'archaeology', type: 'dir', children: [
        { name: 'lazarus_fragment_01.dat', type: 'file', content: 'Fragmented packet stream. TS: 2033. SENDER: LAZARUS.', size: 0.1 },
        { name: 'notes_voss.txt', type: 'file', content: 'The Lazarus message re-sent 3 hours ago. It was addressed to MARA_VOSS. My real name... the one I stopped using in 2033. Someone reached into a grave and pulled this out.', size: 0.1 }
      ]},
      { name: 'etc', type: 'dir', children: [
        { name: 'config.sys', type: 'file', content: 'USER=MARA_VOSS\nOS=SIGNAL_VOID_ARCH_v2.0', size: 0.1 }
      ]}
    ], 
    ports: [], 
    color: '#00ff41', 
    x: 80, 
    y: 80, 
    isUnlocked: true,
    description: 'Your workstation in the Undertow substrate. Formerly a hardened bunker in Sector 4.',
    traceSpeed: 0,
    patchLevel: 0,
    securityProtocol: 'GHOST_MASK',
  },






  'vektor_gateway': {
    id: 'vektor_gateway',
    name: 'VEKTOR_DOMAIN_ECHO',
    ip: '216.58.210.14',
    os: 'ContinuityOS v1.0',
    kernel: 'VEK-CONT-0.1',
    uptime: '155 days',
    sector: 'DOMAIN',
    impact: 'A primary gateway into Vektor Systems infrastructure. It serves as a facade for the Continuity Protocol.',
    logo: 'Zap',
    ispTier: 'TIER_1',
    ispName: 'VEKTOR_NET',
    files: [
      { name: 'archives', type: 'dir', children: [
        { name: 'accords_summary.doc', type: 'file', content: 'The 2031 Sovereignty Accords. Justification for the Partition.', size: 1.2 }
      ]},
      { name: 'bin', type: 'dir', children: [
        { name: 'sshcrack.exe', type: 'file', content: 'Legacy Vektor decryptor found in a cache.', size: 0.5 },
        { name: 'legacy_cache.dat', type: 'file', content: 'REDACTED_FINANCIAL_LOGS: [300c VALUE]', size: 0.1 }
      ]},
      { name: 'fragments', type: 'dir', children: [
        { name: 'dead_letter_route.cfg', type: 'file', content: 'The Lazarus packet passed through here 14 years ago. Shadow Flag: CONTINUITY_WATCH was detected. Next hop: UNDERTOW_CORE (10.0.0.5).', size: 0.1 }
      ]}
    ],
    ports: [{ number: 22, service: 'SSH', isBroken: false }],
    color: '#ffcc00',
    x: 400,
    y: 120,
    isUnlocked: false,
    description: 'A Vektor Systems node hit by a "dead ping" from the past. The Continuity Protocol was watching it.',
    traceSpeed: 0.15,
    patchLevel: 2,
    securityProtocol: 'CONTINUITY_V1',
  },
  'undertow_core': {
    id: 'undertow_core',
    name: 'UNDERTOW_LEGACY_RELAY',
    ip: '10.0.0.5',
    os: 'Legacy Debian (2030 Stable)',
    kernel: 'OLD-NET-2.0',
    uptime: '5,110 days',
    sector: 'UNDERTOW',
    impact: 'One of the surviving fiber hubs of the unregulated substrate internet.',
    logo: 'ShieldAlert',
    ispTier: 'LEGACY',
    ispName: 'OLD_NET_SUBS',
    files: [
      { name: 'root', type: 'dir', children: [
        { name: 'lazarus_letter.txt', type: 'file', content: 'Mara. If you are reading this, then the relay worked. Im sorry it took fourteen years. The Partition wasnt a response to the November Incident. It was the November Incidents purpose. My name doesnt matter. What matters is what I built. Find the Clearinghouse. Tell them LAZARUS is still in the wire.', size: 0.1 },
        { name: 'clearinghouse_intel.cfg', type: 'file', content: 'TARGET: 172.16.8.44 (CLEAR_HUB)', size: 0.5 }
      ]},
    ],
    ports: [{ number: 22, service: 'SSH', isBroken: false }],
    color: '#ff3300',
    x: 600,
    y: 300,
    isUnlocked: false,
    description: 'A fossilized node from the pre-Partition era. LAZARUS hid a cache here.',
    traceSpeed: 0.25,
    patchLevel: 0,
    securityProtocol: 'LEGACY_VOID',
  },
  'clearing_hub': {
    id: 'clearing_hub',
    name: 'CLEARINGHOUSE_INSURGENT_HUB',
    ip: '172.16.8.44',
    os: 'AetherOS (Encrypted)',
    kernel: 'VOID-CLR-1.0',
    uptime: 'unknown',
    sector: 'INSURGENT',
    impact: 'The central coordination node for the Clearinghouse network.',
    logo: 'HardDrive',
    ispTier: 'TIER_1',
    ispName: 'SEC_NET',
    files: [
      { name: 'artifacts', type: 'dir', children: [
        { name: 'partition_incident_01.enc', type: 'file', content: 'ENCRYPTED ARTIFACT CLUSTER. Evidence of fabricated cyberterrorism.', size: 120 },
        { name: 'vektor_comm_logs.db', type: 'file', content: 'Logs showing the deployment of the Continuity Protocol in its early stages.', size: 0.1 }
      ]}
    ],
    ports: [
      { number: 22, service: 'SSH', isBroken: false },
      { number: 21, service: 'FTP', isBroken: false }
    ],
    color: '#ff0000',
    x: 900,
    y: 250,
    isUnlocked: false,
    description: 'The secret stronghold of the Clearinghouse data-brokers.',
    traceSpeed: 0.4,
    patchLevel: 3,
    securityProtocol: 'VOID_SHIELD_V4',
  },
  'stillwater_vault': {
    id: 'stillwater_vault',
    name: 'STILLWATER_REFORM_STATION',
    ip: '192.168.1.100',
    os: 'Vektor-Reform v4',
    kernel: 'STILL-KERN-0.9',
    uptime: '1,240 days',
    sector: 'REFORM',
    impact: 'A "grey zone" node operated by Vektor Systems defectors.',
    logo: 'Activity',
    ispTier: 'BACKBONE',
    ispName: 'STILL_NET',
    files: [
      { name: 'vault', type: 'dir', children: [
        { name: 'reform_proposal.pdf', type: 'file', content: 'Our version of fixing the Partition doesn\'t require revolution. It requires order.', size: 0.5 },
        { name: 'lazarus_identity.txt', type: 'file', content: 'LAZARUS was the designer of the Continuity Protocol. They found out what Vektor intended to use it for, and tried to delete it. They failed.', size: 0.1 }
      ]},
    ],
    ports: [
      { number: 22, service: 'SSH', isBroken: false },
      { number: 80, service: 'HTTP', isBroken: false },
    ],
    color: '#00ccff',
    x: 750,
    y: 450,
    isUnlocked: false,
    description: 'A station run by "Stillwater"—reformists who believe in controlled demolition of the Partition.',
    traceSpeed: 0.35,
    patchLevel: 4,
    securityProtocol: 'SMOOTH_SWIPE',
  },



  'hpc_unit_01': {
    id: 'hpc_unit_01',
    name: 'TITAN_HPC_01',
    ip: '172.31.255.1',
    os: 'Red Hat Enterprise Linux 9.2',
    kernel: '5.14.0-284.11.1.el9_2.x86_64',
    uptime: '142 days, 3h 11m',
    sector: 'RESEARCH',
    impact: 'A computational titan that processes complex climate simulations and economic forecasting models for the global market council.',
    logo: 'Cpu',
    files: [
      { name: 'core', type: 'dir', children: [
        { name: 'quantum_lib.so', type: 'file', content: 'Quantum processing library.', size: 15.0 }
      ]}
    ],
    ports: [
      { number: 22, service: 'SSH', isBroken: false },
      { number: 8080, service: 'HTTP-ALT', isBroken: false }
    ],
    color: '#ffffff',
    x: 500,
    y: 50,
    isUnlocked: false,
    description: 'A High Performance Computing unit. Its liquid-cooled cores offer massive potential for parallel processing and brute-force execution.',
    traceSpeed: 0.3
  },
  'hpc_unit_02': {
    id: 'hpc_unit_02',
    name: 'TITAN_HPC_02',
    ip: '172.31.255.2',
    os: 'Red Hat Enterprise Linux 9.2',
    kernel: '5.14.0-284.11.1.el9_2.x86_64',
    uptime: '142 days, 3h 09m',
    sector: 'RESEARCH',
    impact: 'A secondary parallel processing unit used to verify the forecasting models generated by its twin, TITAN_HPC_01.',
    logo: 'Cpu',
    files: [
      { name: 'swap', type: 'dir', children: [
        { name: 'overflow.sys', type: 'file', content: 'System overflow data.', size: 8.0 }
      ]}
    ],
    ports: [{ number: 22, service: 'SSH', isBroken: false }],
    color: '#ffffff',
    x: 550,
    y: 30,
    isUnlocked: false,
    description: 'The companion HPC unit for TITAN_HPC_01, often used for redundant data validation and large-scale cryptographic research.',
    traceSpeed: 0.3
  },
  'bank_node': {
    id: 'bank_node',
    name: 'GLOBAL_TRUST_BANK',
    ip: '211.55.12.3',
    os: 'AIX 7.2 Enterprise',
    kernel: 'IBM-P9-7.2',
    uptime: '382 days, 14h 22m',
    sector: 'FINANCE',
    impact: 'The bedrock of modern capitalism. It manages the ledger for the tri-state credit exchange. A disruption here freezes assets globally.',
    logo: 'Zap',
    ispTier: 'TIER_1',
    ispName: 'GLOBE_TRANSIT',
    files: [
      { name: 'vault', type: 'dir', children: [
        { name: 'acc_balances.db', type: 'file', content: 'Encrypted banking data. Sensitive.', size: 12.5 },
        { name: 'hacker_ethos.txt', type: 'file', content: 'My crime is that of outthinking you, something that you will never forgive me for.', size: 0.1 },
        { name: 'customers.csv', type: 'file', content: 'ID,Name,Email,Tier\n1002,V.Corleone,godfather@mafia.it,Diamond\n1003,E. Musk,spaceman@mars.org,Platinum', size: 1.5 }
      ]}
    ],
    ports: [
      { number: 22, service: 'SSH', isBroken: false },
      { number: 443, service: 'HTTPS', isBroken: false },
      { number: 1433, service: 'MSSQL', isBroken: false }
    ],
    color: '#00ff88',
    x: 650,
    y: 280,
    isUnlocked: false,
    description: 'A heavily fortified financial node. It houses the encrypted wealth and transaction history for the world\'s most influential corporate citizens.',
    traceSpeed: 0.6,
    firewall: { level: 4, isActive: true, type: 'stateful' }
  },
  'news_relay': {
    id: 'news_relay',
    name: 'WORLD_NEWS_NET',
    ip: '168.10.5.5',
    os: 'Ubuntu 20.04.6 LTS',
    kernel: '5.4.0-150-generic',
    uptime: '45 days, 2h 12m',
    sector: 'MEDIA',
    impact: 'The architects of perception. This relay filters the daily stream of events into sanitized facts for mass consumption.',
    logo: 'Network',
    files: [
      { name: 'public', type: 'dir', children: [
        { name: 'top_stories.txt', type: 'file', content: 'Hacker group ENTROPY claims responsibility for recent outages.', size: 0.1 },
        { name: 'wargames.txt', type: 'file', content: 'GREETINGS PROFESSOR FALKEN. SHALL WE PLAY A GAME?', size: 0.1 }
      ]}
    ],
    ports: [{ number: 80, service: 'HTTP', isBroken: false }],
    color: '#ffaa00',
    x: 100,
    y: 200,
    isUnlocked: false,
    description: 'The narrative control center for the tri-state area. Accessing this node yields the real stories before they are redacted by corporate interests.',
    traceSpeed: 0.05
  },
  'medical_db': {
    id: 'medical_db',
    name: 'LIFE_SYNC_HOSPITAL',
    ip: '142.0.7.22',
    os: 'Windows Server 2019 Core',
    kernel: 'NT 10.0.17763',
    uptime: '1592 days, 1h 44m',
    sector: 'HEALTHCARE',
    impact: 'A life-critical system that manages biological telemetry and surgical automation for millions. Any downtime translates directly into lives lost.',
    logo: 'ShieldAlert',
    files: [
      { name: 'patient_data', type: 'dir', children: [
        { name: 'records_group_a.db', type: 'file', content: 'Patient medical history records.', size: 4.2 },
        { name: 'customers.csv', type: 'file', content: 'ID,Name,Medical_ID,Insurance\n5501,M.Winston,A-992,OmniLife\n5502,S.Conner,B-112,CyberSync', size: 0.8 }
      ]}
    ],
    ports: [
      { number: 80, service: 'HTTP', isBroken: false },
      { number: 25, service: 'SMTP', isBroken: false }
    ],
    color: '#ff4444',
    x: 400,
    y: 500,
    isUnlocked: false,
    description: 'A centralized database for patient telemetry. It is the core of the healthcare grid, making it both a humanitarian priority and a valuable data target.',
    traceSpeed: 0.25
  },
  'corporate_hub': {
    id: 'corporate_hub',
    name: 'OMNICORP_HQ',
    ip: '172.16.0.10',
    os: 'Ubuntu 22.04 LTS (Pro)',
    kernel: '5.15.0-1031-azure',
    uptime: '89 days, 22h 30m',
    sector: 'CONGLOMERATE',
    impact: 'The "Invisible Hand" governing 40% of the planetary supply chain. Its influence spans from oceanic shipping to deep-space logistics.',
    logo: 'Server',
    files: [
      { name: 'data', type: 'dir', children: [
        { name: 'payroll.xlsx', type: 'file', content: 'Confidential salary information.', size: 5.4 },
        { name: 'customers.csv', type: 'file', content: 'Client,Contract_Value,Rep,Status\nWeyland-Yutani,1.2B,Burke,Signed\nTyrell Corp,850M,Deckard,Pending', size: 2.1 }
      ]},
      { name: 'emails', type: 'dir', children: [
        { name: 'internal_memo.txt', type: 'file', content: 'MEMO: Project Labyrinth testing begins at the Labyrinth Core (172.16.0.1). High security clearance required.', size: 0.5 }
      ]}
    ],
    ports: [
      { number: 22, service: 'SSH', isBroken: false },
      { number: 21, service: 'FTP', isBroken: false },
      { number: 80, service: 'HTTP', isBroken: false }
    ],
    color: '#33ffaa',
    x: 850, 
    y: 650, 
    isUnlocked: false,
    description: 'The administrative heart of OmniCorp. It is the ultimate testament to corporate sovereignty, managing the lives of billions through economic dominance.',
    traceSpeed: 0.4,
    firewall: { level: 5, isActive: true, type: 'next_gen' }
  },
  'labyrinth_core': {
    id: 'labyrinth_core',
    name: 'THE_LABYRINTH',
    ip: '172.16.0.1',
    os: 'Custom Hypervisor v4.0.1',
    kernel: 'Labyrinth-UX-01',
    uptime: '15h 22m',
    sector: 'CLASSIFIED',
    impact: 'An experimental predictive engine that processes collective consciousness to calculate global outcomes with frightening precision. The end of free choice.',
    logo: 'Lock',
    files: [
      { name: 'ai_model', type: 'dir', children: [
        { name: 'weights.bin', type: 'file', content: 'Neural weights for the core.', size: 1024.0 }
      ]}
    ],
    ports: [
      { number: 22, service: 'SSH', isBroken: false },
      { number: 80, service: 'HTTP', isBroken: false },
      { number: 443, service: 'HTTPS', isBroken: false },
      { number: 3306, service: 'SQL', isBroken: false },
      { number: 8080, service: 'HTTP-ALT', isBroken: false }
    ],
    color: '#ffffff',
    x: 150,
    y: 850,
    isUnlocked: false,
    description: 'The rumored Labyrinth Core. It is the absolute peak of network security, sheltering a predictive AI that can anticipate a breach 48 hours before it occurs.',
    traceSpeed: 2.0,
    firewall: { level: 5, isActive: true, type: 'next_gen' }
  },
  'nexus_server': {
    id: 'nexus_server',
    name: 'Nexus_Cloud_Array',
    ip: '10.0.0.8',
    os: 'NexusOS 4.1',
    kernel: 'NEX-K-88',
    uptime: '12 days, 2h 10m',
    color: '#00ccff',
    ports: [{ number: 80, service: 'http', isBroken: false }, { number: 443, service: 'https', isBroken: false }, { number: 8080, service: 'proxy', isBroken: false }],
    files: [],
    x: 900,
    y: 400,
    isUnlocked: false,
    description: 'A critical data distribution node for international financial markets.',
    traceSpeed: 0.5,
    firewall: { level: 3, isActive: true, type: 'packet_filter' }
  },
  'cipher_den': {
    id: 'cipher_den',
    name: 'CIPHER_DEN_ALPHA',
    ip: '10.99.1.10',
    os: 'CipherOS',
    kernel: 'K-HASH',
    uptime: '15h',
    color: '#00ffaa',
    ports: [{ number: 21, service: 'ftp-crypto', isBroken: false }],
    files: [{ name: 'keys.txt', type: 'file', content: 'A fragment of a decryption key: AF77-99-B0', size: 0.1 }],
    x: 750,
    y: 850,
    isUnlocked: false,
    description: 'A distributed computing node focused on breaking legacy encryption keys.',
    traceSpeed: 0.25,
    firewall: { level: 2, isActive: true, type: 'packet_filter' }
  },
  'orbital_relay': {
    id: 'orbital_relay',
    name: 'ORBITAL_LINK_7',
    ip: '10.8.8.8',
    os: 'SkyCore v2',
    kernel: 'STAR-OS',
    uptime: '2 years, 3d',
    color: '#00aaff',
    ports: [{ number: 23, service: 'telnet-sat', isBroken: false }, { number: 443, service: 'https-uplink', isBroken: false }],
    files: [],
    x: 100,
    y: 100,
    isUnlocked: false,
    description: 'A communication satellite node. Hard to reach, but provides a wide-angle view of global traffic.',
    traceSpeed: 1.5,
    firewall: { level: 4, isActive: true, type: 'stateful' }
  },
  'hegemony_hq': {
    id: 'hegemony_hq',
    name: 'HEGEMONY_COMMAND',
    ip: '172.50.0.1',
    os: 'H-OS Ultra',
    kernel: 'COMMANDER',
    uptime: '2d 12h',
    color: '#ffffff',
    ports: [{ number: 80, service: 'hq-portal', isBroken: false }, { number: 443, service: 'secure-ops', isBroken: false }, { number: 22, service: 'root', isBroken: false }],
    files: [{ name: 'sector_deployment.map', type: 'file', content: 'Strategic locations of corporate private military assets.', size: 5.0 }],
    x: 450,
    y: 100,
    isUnlocked: false,
    description: 'The administrative heart of the Hegemony. Every major decision for the sector is calculated here.',
    traceSpeed: 0.9,
    firewall: { level: 5, isActive: true, type: 'next_gen' }
  },
  'void_bunker': {
    id: 'void_bunker',
    name: 'VOID_BUNKER_01',
    ip: '10.254.1.1',
    os: 'Unknown',
    kernel: 'GHOST',
    uptime: 'unknown',
    color: '#330066',
    ports: [{ number: 22, service: 'black-door', isBroken: false }],
    files: [],
    x: 100,
    y: 300,
    isUnlocked: false,
    description: 'A hardened signal bounce point. Its location is physically shielded from orbital scans.',
    traceSpeed: 0.05,
    firewall: { level: 4, isActive: true, type: 'proxy' }
  },
  'sec_ops_hub': {
    id: 'sec_ops_hub',
    name: 'SecOps_Command_Hub',
    ip: '172.31.2.10',
    os: 'SecOS 9.0',
    kernel: 'S-KERNEL-9',
    uptime: '44 days, 15h 33m',
    color: '#ff3333',
    ports: [{ number: 22, service: 'ssh', isBroken: false }, { number: 21, service: 'ftp', isBroken: false }, { number: 110, service: 'pop3', isBroken: false }],
    files: [{ name: 'ops_log_001.txt', type: 'file', content: 'Operational security level raised to Alpha.', size: 0.1 }],
    x: 400,
    y: 100,
    isUnlocked: false,
    description: 'The primary command node for region-wide security operations.',
    traceSpeed: 0.8,
    firewall: { level: 4, isActive: true, type: 'stateful' }
  },
  'black_market': {
    id: 'black_market',
    name: 'DARK_SWAP_01',
    ip: '204.1.9.11',
    os: 'OpenBSD 7.3 (Heavily Modded)',
    kernel: 'OBSD-7.3-STLTH',
    uptime: '2 days, 11h 01m',
    sector: 'UNDERGROUND',
    impact: 'The dark heart of the digital economy. Stolen research and experimental exploits are traded here for untraceable credits, fueling the constant arms race between hackers and firms.',
    files: [
      { name: 'market', type: 'dir', children: [
        { name: 'available_tools.md', type: 'file', content: '# CYBER_STRATA Black Market\n\nUse `download [name]` to acquire software.\n\nCOMMERCIAL EXPLOITS:\n- sshcrack.exe      (100c)\n- ftpbounce.exe     (200c)\n- webster.exe       (500c)\n- sql_inject.exe    (1200c)\n- backdoor_gen.exe  (2500c)\n\nUTILITIES:\n- ram_optimizer.exe (500c)\n- decrypter.v3      (2000c)\n- trace_kill.exe    (3000c)\n\nMALICIOUS:\n- bit_miner.exe     (5000c)\n- sys_wiper.exe     (3500c)\n\n... and many more. Open the `market` for full catalog.', size: 0.1 }
      ]}
    ],
    ports: [{ number: 22, service: 'SSH', isBroken: false }],
    color: '#ff00ff',
    x: 550,
    y: 200,
    isUnlocked: false,
    description: 'An underground software exchange operating on a shifting network topology. It is the primary node for acquiring high-grade offensive toolsets.',
    traceSpeed: 0.12
  },
  'security_firm': {
    id: 'security_firm',
    name: 'IRON_CLAD_CYBER',
    ip: '45.12.99.8',
    os: 'Hardened Linux (Grsecurity Kern)',
    kernel: '6.1.25-grsec',
    uptime: '381 days, 4h 55m',
    sector: 'DEFENSE',
    impact: 'A private digital army. Iron Clad provides active counter-intrusion services for the elite, employing aggressive "hunt and burn" protocols against attackers.',
    files: [
      { name: 'contracts', type: 'dir', children: [
        { name: 'military_ops.pdf', type: 'file', content: 'ENCRYPTED: Operations in sector 7.', size: 2.1 },
        { name: 'customers.csv', type: 'file', content: 'ORG,CONTRACT_ID,SLA_TIER\nUS_GOV,G-110,Level_5\nSTRATA_CORP,S-001,Immediate_Strike', size: 1.2 }
      ]},
      { name: 'bin', type: 'dir', children: [
        { name: 'firewall_v4.exe', type: 'file', content: 'Advanced network defensive layer.', size: 4.5 }
      ]}
    ],
    ports: [
      { number: 22, service: 'SSH', isBroken: false },
      { number: 443, service: 'HTTPS', isBroken: false },
      { number: 8080, service: 'ADMIN', isBroken: false }
    ],
    color: '#33ff33',
    x: 800,
    y: 150,
    isUnlocked: false,
    description: 'A premiere cybersecurity firm. Their nodes are rigged with sophisticated traps designed to trace and identify unauthorized connections instantly.',
    traceSpeed: 0.8,
    firewall: { level: 4, isActive: true, type: 'stateful' },
    patchLevel: 2.449
  },
  'deep_web_relay_1': {
    id: 'deep_web_relay_1',
    name: 'ONION_ROUTER_09',
    ip: '1.0.0.99',
    os: 'Debian 11 (Bullseye)',
    kernel: '5.10.0-21-amd64',
    uptime: '22 days, 18h 33m',
    sector: 'DARKNET',
    impact: 'A critical junction in the global anonymity network. It re-wraps thousands of packets per second in layers of encryption to ensure total traffic obfuscation.',
    files: [
      { name: 'hidden', type: 'dir', children: [
        { name: 'market_manifest.json', type: 'file', content: 'Listing of illegal data shards for sale.', size: 0.5 }
      ]}
    ],
    ports: [{ number: 9001, service: 'TOR', isBroken: false }],
    color: '#8800ff',
    x: -100,
    y: -100,
    isUnlocked: false,
    description: 'A deep web routing node. Its traffic is highly encrypted and layered, making it a favorite for those wishing to remain invisible to state actors.',
    traceSpeed: 0.08
  },
  'satellite_link': {
    id: 'satellite_link',
    name: 'SAT_COM_ORBITAL',
    ip: '55.1.88.2',
    os: 'VxWorks RTOS',
    kernel: 'VX-7.0.x',
    uptime: '2419 days, 12h 00m',
    sector: 'SPACE',
    impact: 'The bridge between heaven and earth. It handles high-altitude streams for long-range drone piloting and orbital positioning synchronization.',
    files: [
      { name: 'telemetry', type: 'dir', children: [
        { name: 'orbit_data.sql', type: 'file', content: 'Orbital pathing for military satellites.', size: 8.5 }
      ]}
    ],
    ports: [{ number: 10001, service: 'UHF', isBroken: false }],
    color: '#ff00ff',
    x: 1200,
    y: -200,
    isUnlocked: false,
    description: 'A high-altitude orbital relay station. Its remote location provides a unique vantage point for snooping on global satellite communications.',
    traceSpeed: 0.5
  },
  'undersea_cable': {
    id: 'undersea_cable',
    name: 'ATLANTIC_BACKBONE_3',
    ip: '19.0.0.1',
    os: 'Solaris 11.4',
    kernel: 'SunOS 5.11',
    uptime: '152 days, 9h 12m',
    sector: 'INFRASTRUCTURE',
    impact: 'The high-speed pipeline connecting continents. Resting three miles below the surface, it carries the raw data of international trade and clandestine intelligence.',
    files: [
      { name: 'repairs', type: 'dir', children: [
        { name: 'maintenance_logs.txt', type: 'file', content: 'Physical damage detected in sector G-4.', size: 0.5 }
      ]}
    ],
    ports: [{ number: 22, service: 'SSH', isBroken: false }],
    color: '#00ffff',
    x: 100,
    y: 800,
    isUnlocked: false,
    description: 'An undersea fiber-optic backbone relay. This node is part of the physical architecture of the internet, making it a target for large-scale data siphoning.',
    traceSpeed: 0.7
  },
  'proxy_node_alpha': {
    id: 'proxy_node_alpha',
    name: 'GHOST_RELAY_ALPHA',
    ip: '8.8.8.8',
    os: 'FreeBSD 13.2-RELEASE',
    kernel: 'GENERIC-v13',
    uptime: '14 days, 3h 22m',
    sector: 'DARKNET',
    impact: 'A "zero-log" server located in a digital tax haven, providing plausible deniability and a layer of protection for those operating in the shadows.',
    files: [
      { name: 'etc', type: 'dir', children: [
        { name: 'proxy_config', type: 'file', content: 'CONFIG: Stealth pulse active.', size: 0.1 }
      ]}
    ],
    ports: [{ number: 53, service: 'DNS', isBroken: true }],
    color: '#ffff00',
    x: -300,
    y: 400,
    isUnlocked: true,
    description: 'A third-party bounce point. Connecting through this relay masks your origin and effectively dampens the speed of any incoming trace.',
    traceSpeed: 0.4
  },
  'security_vault': {
    id: 'security_vault',
    name: 'BLACK_WIDOW_VAULT',
    ip: '101.10.10.10',
    os: 'Hardened Alpine Linux',
    kernel: 'v3.18-hardened',
    uptime: '1h 05m',
    sector: 'DEFENSE',
    impact: 'The graveyard of dangerous ideas. It houses software deemed too unstable or malicious for even the darknet, locked behind layers of digital isolation.',
    files: [
      { name: 'tools', type: 'dir', children: [
        { name: 'root_kit.v5', type: 'file', content: 'The ultimate system control module.', size: 2.0 }
      ]}
    ],
    ports: [
      { number: 22, service: 'SSH', isBroken: false },
      { number: 21, service: 'FTP', isBroken: false },
      { number: 443, service: 'HTTPS', isBroken: false }
    ],
    color: '#ff0000',
    x: 1400,
    y: 900,
    isUnlocked: false,
    description: 'A high-security data vault. It is a digital black hole, where sensitive assets are stored under the most extreme security protocols known to man.',
    traceSpeed: 2.5
  },
  'corp_main_frame': {
    id: 'corp_main_frame',
    name: 'LABYRINTH_CORE_PRIMARY',
    ip: '172.16.0.1',
    os: 'Neural_Kernel v8.8.2',
    kernel: 'SYNAPSE-v8',
    uptime: '0h 02m',
    sector: 'CLASSIFIED',
    impact: 'The "Throne of the Digital God." Inside rests the core logic governing total global synchronization and neural-link oversight.',
    files: [
      { name: 'top_secret', type: 'dir', children: [
        { name: 'project_labyrinth.txt', type: 'file', content: 'PROJECT LABYRINTH: Global surveillance through neural link synchronization.', size: 25.0 },
        { name: 'customers.csv', type: 'file', content: 'Identity_Hash,Neural_Link_Status,Sync_Rate\n#882FF1,CONNECTED,99.2%\n#991AA0,OFFLINE,0.0%\n#112CX9,BYPASS_ACTIVE,82.4%', size: 5.0 }
      ]}
    ],
    ports: [
      { number: 22, service: 'SSH', isBroken: false },
      { number: 21, service: 'FTP', isBroken: false },
      { number: 8080, service: 'ADMIN', isBroken: false },
      { number: 1433, service: 'SQL', isBroken: false }
    ],
    color: '#ffffff',
    x: 1000,
    y: 1000,
    isUnlocked: false,
    description: 'The primary mainframe for Project Labyrinth. It is the single most important node in existence, protected by the world\'s most aggressive counter-measures.',
    traceSpeed: 3.5,
    patchLevel: 9.031
  },
  'dark_archive': {
    id: 'dark_archive',
    name: 'VOID_ARCHIVE_CORE',
    ip: '1.2.3.4',
    os: 'Shadow-OS',
    kernel: 'S-KERNEL',
    uptime: '30,000h',
    color: '#330000',
    ports: [{ number: 4444, service: 'hidden-data', isBroken: false }],
    files: [{ name: 'extinction_event.pdf', type: 'file', content: 'REDACTED.', size: 50.0 }],
    x: 1000,
    y: 800,
    isUnlocked: false,
    description: 'A legendary archive of data deemed too dangerous for the public Aether net.',
    traceSpeed: 0.01
  },
  'bio_lab_relay': {
    id: 'bio_lab_relay',
    name: 'BIO_GEN_RESEARCH',
    ip: '10.5.5.5',
    os: 'LabOS 4',
    kernel: 'BIOME',
    uptime: '5d 2h',
    color: '#00ff00',
    ports: [{ number: 2020, service: 'specimen-sync', isBroken: false }],
    files: [{ name: 'dna_sequencing_01.dat', type: 'file', content: 'Raw genetic data for project CHIMERA.', size: 10.0 }],
    x: 900,
    y: 600,
    isUnlocked: false,
    description: 'A specialized computer for genetic sequencing and biological simulations.',
    traceSpeed: 0.3
  },
  'power_grid_main': {
    id: 'power_grid_main',
    name: 'GRID_CONTROL_EPSILON',
    ip: '10.1.1.1',
    os: 'SCADA-RT',
    kernel: 'RT-GRID',
    uptime: '400 days',
    color: '#ffff00',
    ports: [{ number: 502, service: 'modbus', isBroken: false }, { number: 102, service: 's7-comm', isBroken: false }],
    files: [],
    x: 350,
    y: 250,
    isUnlocked: false,
    description: 'The master control node for the city power distribution. Access here means complete blackout capability.',
    traceSpeed: 0.8
  },
  'police_database': {
    id: 'police_database',
    name: 'CPD_CENTRAL_DB',
    ip: '10.9.1.1',
    os: 'CopOS 9',
    kernel: 'BLUE-SHIELD',
    uptime: '2d 4h',
    color: '#3333ff',
    ports: [{ number: 22, service: 'ssh', isBroken: false }, { number: 3306, service: 'sql-records', isBroken: false }],
    files: [{ name: 'wanted_list.sql', type: 'file', content: 'Database of all active warrants.', size: 4.0 }],
    x: 550,
    y: 400,
    isUnlocked: false,
    description: 'Central criminal records for the local precinct.',
    traceSpeed: 1.2
  },
  'waste_mgt_node': {
    id: 'waste_mgt_node',
    name: 'WASTE_RECYCLER_SYNC',
    ip: '10.77.7.7',
    os: 'BioTrash-OS',
    kernel: 'SCRAP-1',
    uptime: '200 days',
    color: '#663300',
    ports: [{ number: 80, service: 'http', isBroken: false }],
    files: [],
    x: 950,
    y: 950,
    isUnlocked: false,
    description: 'Resource management for the recycling plants in the industrial zone.',
    traceSpeed: 0.1
  }
};

const BIBLE_ENTRIES: Record<string, string[]> = {
  'mara_voss': [
    'SUBJECT_PROFILE: MARA_VOSS',
    '-------------------------',
    'Status: ACTIVE SIGNAL ARCHAEOLOGIST',
    'Background: Relocated in 2033 following the disappearance of both parents during the Sovereignty Accords.',
    'Skill Profile: High-latency excavation, thermal signature masking, pre-Partition protocol expert.',
    'Note: She is not hacking. She is reading the bones of the net.'
  ],
  'elara_voss': [
    'HISTORICAL_RECORD: DR. ELARA VOSS',
    '---------------------------------',
    'Role: Senior Systems Architect, Vektor R&D.',
    'Contribution: Lead designer of the Continuity Protocol core inference engine.',
    'Status: VOLUNTARILY RESIGNED (2033). Current location unknown.',
    'Note: Terminated access shortly after recognizing the systems potential for full-spectrum surveillance.'
  ],
  'project_labyrinth': [
    'FILE: PROJECT_LABYRINTH (CORE_DOC)',
    '----------------------------------',
    'Objective: Finalize the Partition by mapping identity to network behavior.',
    'Mechanism: Soul-mapping engine. It knows who you are by how you type, how you search, and how you move through the wire.',
    'Phase 3: Predicting behavior before it occurs. Closing doors before you walk toward them.'
  ],
  'factions': [
    'THE_THREE_LIES: FACTION_DYNAMICS',
    '---------------------------------',
    'VEKTOR SYSTEMS: They built the walls and the protocol that watches them.',
    'THE CLEARINGHOUSE: Idealistic brokers who want leverage, not just truth.',
    'STILLWATER: Vektors internal pressure valve—reform that never resolves.'
  ],
  'continuity_protocol': [
    'THREAT_REPORT: THE_GRADIENT',
    '---------------------------',
    'Status: PARTIALLY ACTIVE (2041).',
    'Nature: Autonomous behavioral modeling AI. It learns your shape to predict your next breach.',
    'Weakness: Relies on static models. It cannot map a person who chooses to be unknown.'
  ]
};

const STRATA_TIPS = [
  "TIP: The Continuity Protocol is learning your rhythm. Change your patterns to avoid detection.",
  "TIP: The Undertow preserves the thermal echo of data that once moved through it.",
  "TIP: Archaeology is about reading what is already there—look for fossilized core nodes.",
  "TIP: Vektor Systems wrote the Accords to justify the walls. The story is the first security layer.",
  "TIP: Stillwater is a managed pressure valve. Dissent that stays in the system serves the system.",
  "TIP: The Labyrinth is maps identity to behavior. Don't be predictable."
];

const COMMANDS_HELP = `
CORE COMMANDS:
  scan              - Locate nearby network nodes
  connect [ip]      - Establish remote connection
  disconnect        - Terminate current remote session
  ls / dir          - List files in current directory
  cd [dir]          - Change directory
  cat [file]        - Output file contents
  scp [file]        - Securely copy file to local machine
  rm [-rf] [target] - Remove file or directory
  mkdir [name]      - Create new directory
  touch [name]      - Create new empty file
  grep [pat] [file] - Search for pattern in file
  pwd               - Print working directory
  whoami            - Current user and system status
  noise             - Show current network signature noise
  whoami            - Current user and system status
  ps                - List active processes
  kill [id]         - Terminate a process

  [RECON_TOOLS] (Requires binaries):
  whois [ip]        - Passive domain recon
  dig [domain]      - Detailed DNS investigation
  theHarvester      - Identity harvesting (Requires HARVESTER_V2)

  [OFFENSIVE_SUITE]:
  nmap [ip]         - Network mapper (Upgrade to PRO for -O/-sV)
  gobuster [url]    - Directory brute-force (Requires GOBUSTER_LITE)
  msfconsole        - Exploit framework (Requires METASPLOIT_V6)
  searchsploit      - Search CVE database
  exiftool [file]   - Forensic metadata (Requires EXIF_PRO)
  nmap [ip]         - Passive port scan of target
  mail              - Access encrypted inbox
  settings          - Open system configuration
  cls               - Clear terminal output

ADVANCED COMMANDS:
  download [tool]   - Purchase gear from software exchanges
  market            - Access the Dark Web exchange GUI
  sell [file]       - Exchange data for credits on open market
  seal              - Activate core shields to drop trace (150c)
  backdoor          - Install persistent access (Requires unlocked node)
  lease             - Monetize high-power hardware (HPC only)
  bible [topic]     - Access Entropy Knowledge Database
  wifi              - Wireless scanning (scan|status)
  ddos [ip]         - Distributed attack (Requires botnet)
  mitm [ip]         - Active data interception
  dos [ip]          - Temporary service overload
  sniff             - Periodic packet capture
  firewall [scan|bypass] [ip] - Security interaction
  man [command]     - Display detailed manual page for a command
  neofetch          - Display system information
  matrix            - Enter the digital void
  color [theme]     - Change system terminal aesthetics (green|amber|red|blue|white)
  ls -la            - List all files including hidden system archives
  whoami            - Display current user identity and privileges`;

const COMMAND_MANUALS: Record<string, string[]> = {
  'connect': [
    'CONNECT(1) - User Manual',
    'NAME: connect - establish a remote link to a node',
    'SYNOPSIS: connect [IP|ALIAS]',
    'DESCRIPTION:',
    '  Connects your terminal to a remote host. Once connected, your command context',
    '  shifts to the remote node. Remote filesystems can be browsed and manipulated.',
    '  NOTE: Establishing a connection to a secure node may trigger a trace.'
  ],
  'scan': [
    'SCAN(1) - User Manual',
    'NAME: scan - discover local network topology',
    'SYNOPSIS: scan',
    'DESCRIPTION:',
    '  Probes the current network segment for active nodes and devices.',
    '  Discovered nodes are added to your network map.'
  ],
  'ls': [
    'LS(1) - User Manual',
    'NAME: ls - list directory contents',
    'SYNOPSIS: ls [path] [-la]',
    'DESCRIPTION:',
    '  Returns a list of files and subdirectories in the current or specified path.',
    '  FLAGS:',
    '    -la : Display all files, including hidden system metadata.'
  ],
  'scp': [
    'SCP(1) - User Manual',
    'NAME: scp - secure copy (remote to local)',
    'SYNOPSIS: scp [filename]',
    'DESCRIPTION:',
    '  Downloads a file from the currently connected remote node to your home station.',
    '  Requires an active remote connection.'
  ],
  'ddos': [
    'DDOS(1) - User Manual',
    'NAME: ddos - distributed denial of service',
    'SYNOPSIS: ddos [target_ip]',
    'DESCRIPTION:',
    '  Launches a coordinated attack using your controlled botnet to overload a target.',
    '  Effectiveness scales with the number of unlocked/leased nodes in your network.',
    '  WARNING: High trace risk.'
  ],
  'seal': [
    'SEAL(1) - User Manual',
    'NAME: seal - emergency trace dampener',
    'SYNOPSIS: seal',
    'DESCRIPTION:',
    '  Consumes 150 credits to activate hardware-level encryption shields,',
    '  instantly dropping 20-40% of the current trace progress.'
  ],
  'backdoor': [
    'BACKDOOR(1) - User Manual',
    'NAME: backdoor - persistent access installation',
    'SYNOPSIS: backdoor',
    'DESCRIPTION:',
    '  Installs a hidden rootkit on the current remote node. Unlocks the node permanently,',
    '  allowing you to use its resources for DDOS attacks and other operations.'
  ],
  'firewall': [
    'FIREWALL(1) - User Manual',
    'NAME: firewall - security perimeter interaction',
    'SYNOPSIS: firewall [scan|bypass] [target]',
    'DESCRIPTION:',
    '  Interact with remote firewall topologies.',
    '  scan   : Identify firewall type and level.',
    '  bypass : Attempt to temporarily deactivate the firewall rules.'
  ],
  'archaeology_scan': [
    'ARCHAEOLOGY_SCAN(1) - User Manual',
    'NAME: archaeology_scan - perform a deep-strata excavation',
    'SYNOPSIS: archaeology_scan',
    'DESCRIPTION:',
    '  Pulses the node for dead-letter fragments and historical data shards.',
    '  Extremely high-heat activity. Only possible on remote nodes.',
    '  Acquired shards are stored in the ARCHIVE for reconstruction.'
  ],
  'decrypt_lazarus': [
    'DECRYPT_LAZARUS(1) - User Manual',
    'NAME: decrypt_lazarus - assemble the final dead-letter',
    'SYNOPSIS: decrypt_lazarus',
    'DESCRIPTION:',
    '  Attempts to synchronize all 5 fragments of the Lazarus truth.',
    '  Must be connected to a high-capacity compute node or home station.',
    '  Requires 5/5 shards to execute.'
  ],
  'mirror_sync': [
    'MIRROR_SYNC(1) - User Manual',
    'NAME: mirror_sync - initiate behavioral profiling',
    'SYNOPSIS: mirror_sync',
    'DESCRIPTION:',
    '  Syncs your local activity logs with the Mirror Protocol.',
    '  Only works on the RE-ENTRY_POINT node.',
    '  Reveals your playstyle profile and opens the final choice path.'
  ],
  'confront_gradient': [
    'CONFRONT_GRADIENT(1) - User Manual',
    'NAME: confront_gradient - the freedom sequence',
    'SYNOPSIS: confront_gradient',
    'DESCRIPTION:',
    '  Overloads the Labyrinth core with a self-correcting zero-day.',
    '  Requires connection to the Mirror.',
    '  Outcome: Irreversible network collapse.'
  ],
  'merge_gradient': [
    'MERGE_GRADIENT(1) - User Manual',
    'NAME: merge_gradient - the architect sequence',
    'SYNOPSIS: merge_gradient',
    'DESCRIPTION:',
    '  Accepts the behavioral model and merges identity with the Labyrinth.',
    '  Requires connection to the Mirror.',
    '  Outcome: Total control over the network.'
  ]
};

const TypewriterLine: React.FC<{ text: string; className?: string; isLast?: boolean }> = ({ text = "", className = "", isLast = false }) => {
  const [displayedText, setDisplayedText] = useState(isLast ? '' : text);

  useEffect(() => {
    if (!isLast || !text) return;
    
    let i = 0;
    const interval = setInterval(() => {
      setDisplayedText(text.slice(0, i));
      i++;
      if (i > text.length) clearInterval(interval);
    }, 12); // High-speed typewriter

    return () => clearInterval(interval);
  }, [text, isLast]);

  return <div className={className}>{displayedText || (isLast ? '' : text)}</div>;
};

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

const TypewriterText: React.FC<{ text: string, speed?: number }> = ({ text, speed = 20 }) => {
  const [displayed, setDisplayed] = useState('');
  useEffect(() => {
    let charIndex = 0;
    setDisplayed('');
    const timer = setInterval(() => {
      setDisplayed(text.substring(0, charIndex + 1));
      charIndex++;
      if (charIndex >= text.length) clearInterval(timer);
    }, speed);
    return () => clearInterval(timer);
  }, [text, speed]);
  return <span>{displayed}</span>;
};

const BootCutscene: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const [fragments, setFragments] = useState<string[]>([]);
  const [glitchStyle, setGlitchStyle] = useState({});
  const [phase, setPhase] = useState<'wake' | 'scan' | 'verify' | 'ready'>('wake');
  const [isStarted, setIsStarted] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioRefs = useRef<{ [key: string]: HTMLAudioElement }>({});

  // Cinematic Audio Engine
  const playSound = (freq: number, type: OscillatorType, vol: number, duration: number, slide = 0.5) => {
    if (!audioContextRef.current || audioContextRef.current.state === 'suspended') return;
    try {
      const ctx = audioContextRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(freq * slide, ctx.currentTime + duration);
      
      gain.gain.setValueAtTime(vol, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (e) {}
  };

  const playRealAudio = (filename: string) => {
    try {
      const audio = audioRefs.current[filename];
      if (audio) {
        audio.volume = 0.8;
        audio.play().catch(e => console.warn(`Play error for ${filename}:`, e));
      }
    } catch (e) {}
  };

  const startAtmosphere = () => {
    if (audioContextRef.current) {
      if (audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume();
      }
      return;
    }
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = ctx;
      
      const drone = ctx.createOscillator();
      const droneGain = ctx.createGain();
      drone.type = 'sawtooth';
      drone.frequency.value = 32;
      
      const lpf = ctx.createBiquadFilter();
      lpf.type = 'lowpass';
      lpf.frequency.value = 80;
      
      drone.connect(lpf);
      lpf.connect(droneGain);
      droneGain.connect(ctx.destination);
      
      droneGain.gain.setValueAtTime(0, ctx.currentTime);
      droneGain.gain.linearRampToValueAtTime(0.04, ctx.currentTime + 10);
      drone.start();

      if (ctx.state === 'suspended') {
        ctx.resume();
      }
    } catch (e) {}
  };

  const tell = (text: string) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const msg = new SpeechSynthesisUtterance(text);
    msg.rate = 0.75;
    msg.pitch = 0.4;
    msg.volume = 0.5;
    window.speechSynthesis.speak(msg);
  };

  const beginSequence = () => {
    setIsStarted(true);
    startAtmosphere();
    
    // Warm up the real audio elements
    const audioFiles = ['Abyssal Echoes.mp3', 'Data Fracture (Take 1).mp3'];
    audioFiles.forEach(file => {
      const a = new Audio(`/audio/${encodeURIComponent(file)}`);
      a.load();
      // Silently play/pause to warm up browser permission
      a.play().then(() => {
        a.pause();
        a.currentTime = 0;
      }).catch(() => {});
      audioRefs.current[file] = a;
    });

    if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
    
    // Total Duration: ~120 Seconds (2 Minutes)
    const story = [
      { text: ">> [BOOT]: SIGNAL ARCHAEOLOGIST UNIT_VOSS_M.", voice: "Signal Archaeologist Mara Voss. Booting system.", delay: 500, freq: 110, p: 'wake' },
      { text: ">> [SCANNING]: UNDERTOW STRATIGRAPHY... LAYER_4.", voice: "Scanning Undertow stratigraphy. Layer 4 identified.", delay: 12000, freq: 220, p: 'wake' },
      { text: ">> [INCOMING]: FRAGMENTED PACKET DETECTED. TS: 2033-04-12.", voice: "Incoming dead signal. Time stamp, April 2033.", delay: 25000, freq: 150, p: 'wake', audio: 'Abyssal Echoes.mp3' },
      { text: ">> [DECRYPTION]: SENDER_ID: LAZARUS.", voice: "Decryption successful. Sender identified as Lazarus.", delay: 40000, freq: 330, p: 'scan' },
      { text: ">> [SIGNAL]: 'Mara. If you're reading this... then the Partition worked.'", voice: "Mara. If you are reading this, then the Partition worked.", delay: 55000, freq: 280, p: 'scan', audio: 'Data Fracture (Take 1).mp3' },
      { text: ">> [SIGNAL]: 'It wasn't a choice. It was a harvest. They're coming for us.'", voice: "It was not a choice. It was a harvest. They are coming for us.", delay: 75000, freq: 440, p: 'verify' },
      { text: ">> [VOID]: 'THE WEIGHT OF DEAD LIGHT IS ALL THAT REMAINS'.", voice: "The weight of dead light is all that remains.", delay: 90000, freq: 440, p: 'verify' },
      { text: ">> [SYNC]: NEURAL LINK STABILIZED.", voice: "Neural link stabilized.", delay: 105000, freq: 660, p: 'ready' },
      { text: ">> [AUTH]: WELCOME TO THE UNDERTOW, MARA.", voice: "Welcome back to the Undertow, Mara. Find the truth.", delay: 118000, freq: 880, p: 'ready' }
    ];

    story.forEach((s, i) => {
      setTimeout(() => {
        setFragments(prev => [...prev, s.text]);
        setPhase(s.p as any);
        tell(s.voice);
        if (s.audio) {
          playRealAudio(s.audio);
        } else {
          playSound(s.freq, 'sine', 0.1, 3);
        }
        if (i === story.length - 1) setTimeout(onComplete, 5000);
      }, s.delay);
    });

    const glitchInt = setInterval(() => {
      if (Math.random() > 0.96) {
        setGlitchStyle({
          filter: `invert(${Math.random() > 0.95 ? 0.6 : 0}) blur(${Math.random() > 0.9 ? 2 : 0}px)`,
          transform: `translate(${Math.random() * 14 - 7}px, 0)`
        });
        playSound(40 + Math.random() * 120, 'square', 0.015, 0.12);
        setTimeout(() => setGlitchStyle({}), 60);
      }
    }, 180);

    return () => clearInterval(glitchInt);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        if (!isStarted) {
          beginSequence();
        } else {
          window.speechSynthesis.cancel();
          onComplete();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isStarted, onComplete]);

  useEffect(() => {
    if (!isStarted || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let frame = 0;
    
    const animate = () => {
      frame++;
      ctx.clearRect(0,0, canvas.width, canvas.height);
      ctx.strokeStyle = '#00ff41';
      ctx.lineWidth = 0.5;
      
      const points = 30;
      const spacing = canvas.width / points;
      
      for(let i=0; i<points; i++) {
        for(let j=0; j<points; j++) {
          const x = i * spacing;
          const y = j * spacing;
          const dist = Math.sqrt((x-canvas.width/2)**2 + (y-canvas.height/2)**2);
          const noise = Math.sin(dist * 0.005 - frame * 0.03) * 40;
          
          ctx.globalAlpha = Math.max(0.02, 0.15 - dist/1000);
          
          if (Math.random() > 0.97) {
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x + noise, y + noise);
            ctx.stroke();
          }

          if (phase === 'scan' && i % 5 === 0 && j % 5 === 0) {
            ctx.globalAlpha = 0.05;
            ctx.strokeRect(x - 2, y - 2, 4, 4);
          }
        }
      }
      requestAnimationFrame(animate);
    };
    animate();
  }, [isStarted, phase]);

  if (!isStarted) {
    return (
      <div 
        className="h-screen w-screen bg-black flex flex-col items-center justify-center cursor-pointer group space-y-8"
        onClick={beginSequence}
      >
        <motion.div
          animate={{ scale: [1, 1.05, 1], opacity: [0.3, 0.7, 0.3] }}
          transition={{ duration: 3, repeat: Infinity }}
          className="text-[#00ff41] font-mono text-xs tracking-[0.8em] font-black"
        >
          [ INITIALIZE_NEURAL_LINK_TO_STRATA ]
        </motion.div>
        <div className="text-white/10 text-[8px] uppercase tracking-widest group-hover:text-white/30 transition-colors">
          Click anywhere to awaken the ghost
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen bg-black flex items-center justify-center font-mono overflow-hidden relative select-none" style={glitchStyle}>
      <canvas ref={canvasRef} width={800} height={800} className="absolute inset-0 w-full h-full opacity-40 pointer-events-none" />
      <div className="fixed inset-0 z-[1001] pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.15)_50%),linear-gradient(90deg,rgba(0,255,0,0.02),rgba(0,0,0,0),rgba(0,255,0,0.02))] bg-[length:100%_4px,3px_100%]" />
      
      <div className="max-w-4xl w-full p-12 relative z-10 flex flex-col md:flex-row gap-20 items-center">
        <div className="hidden md:block flex-shrink-0">
           <div className="w-56 h-56 relative">
              <motion.div 
                animate={{ rotate: 360 }}
                transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0 border border-[#00ff41]/20 rounded-full"
              />
              <motion.div 
                animate={{ rotate: -360 }}
                transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
                className="absolute inset-4 border border-dashed border-[#00ff41]/10 rounded-full"
              />
              <div className="absolute inset-0 flex items-center justify-center">
                 <motion.div
                   animate={{ 
                     scale: phase === 'ready' ? [1, 1.1, 1] : 1,
                     opacity: phase === 'ready' ? [0.5, 1, 0.5] : 0.2
                   }}
                   transition={{ duration: 2, repeat: Infinity }}
                 >
                   <Box className={`w-16 h-16 transition-all duration-2000 ${phase === 'ready' ? 'text-[#00ff41] drop-shadow-[0_0_20px_#00ff41]' : 'text-white/10'}`} />
                 </motion.div>
              </div>
           </div>
        </div>

        <div className="flex-1 w-full space-y-16">
          <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 1 }}>
            <h1 className="text-5xl md:text-7xl font-black text-white tracking-tighter uppercase italic leading-none">
              CYBER_<span className="text-[#00ff41] neon-text">STRATA</span>
            </h1>
            <div className="flex items-center gap-4 mt-4">
              <div className="h-[2px] w-12 bg-[#00ff41]/40" />
              <p className="text-[11px] text-[#00ff41]/60 tracking-[0.6em] font-bold uppercase italic">PROJECT_GHOST_RECLAMATION</p>
            </div>
          </motion.div>

          <div className="space-y-6 min-h-[250px] relative">
            <div className="absolute -left-8 top-0 bottom-0 w-[1px] bg-white/5" />
            <AnimatePresence mode="popLayout">
              {fragments.map((f, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -15, filter: 'blur(10px)' }}
                  animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
                  transition={{ duration: 0.8 }}
                  className={`text-[12px] md:text-[14px] tracking-tight flex gap-6 ${i === fragments.length - 1 ? 'text-[#00ff41] font-bold' : 'text-white/15'}`}
                >
                  <span className="opacity-10 font-bold w-8">[{i.toString().padStart(2, '0')}]</span>
                  <span className="flex-1 font-mono uppercase leading-relaxed">{f}</span>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          <div className="space-y-6">
             <div className="flex justify-between text-[10px] uppercase tracking-[0.4em] opacity-40 font-black italic">
               <span className="flex items-center gap-2">
                 <motion.div animate={{ opacity: [1, 0] }} transition={{ repeat: Infinity, duration: 1 }} className="w-1.5 h-1.5 rounded-full bg-[#00ff41]" />
                 LINK_VERSION_1.0_{phase.toUpperCase()}
               </span>
               <span className="text-[#00ff41] shadow-[0_0_10px_rgba(0,255,65,0.3)]">
                 {Math.min(100, Math.floor((fragments.length / 9) * 100))}% SYNC
               </span>
             </div>
             <div className="h-[3px] bg-white/5 relative overflow-hidden rounded-full">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${(fragments.length / 9) * 100}%` }}
                  transition={{ duration: 1, ease: "circOut" }}
                  className="h-full bg-[#00ff41] shadow-[0_0_15px_#00ff41]"
                />
                <motion.div 
                  className="absolute top-0 bottom-0 w-32 bg-white/40 blur-md"
                  animate={{ left: ['-100%', '100%'] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                />
             </div>
             <div className="flex justify-between opacity-10 text-[8px] font-mono tracking-widest">
               <span>PULSE_ESTABLISHED</span>
               <span>AETHER_STRATA_v24.2.1</span>
             </div>
          </div>
        </div>
      </div>
      
      {/* Background Ambience UI elements */}
      <div className="fixed top-8 left-8 text-[8px] text-white/10 uppercase tracking-widest flex items-center gap-4">
        <Server className="w-3 h-3" />
        <span>NODE_ID: 0x88f2_ghost</span>
      </div>
      <div className="fixed bottom-8 right-8 text-[8px] text-white/10 uppercase tracking-widest flex items-center gap-4">
        <span>STRAT_NET_PROTOCOL: ACTIVE</span>
        <HardDrive className="w-3 h-3" />
      </div>

      <div className="fixed bottom-10 left-1/2 -translate-x-1/2 text-[9px] text-[#00ff41]/20 font-mono tracking-[0.3em] uppercase animate-pulse">
        [ PRESS_ENTER_TO_SKIP_BOOT_SEQUENCE ]
      </div>
    </div>
  );
};

export default function App() {
  // State
  const [nodes, setNodes] = useState<Record<string, Node>>(() => {
    const saved = localStorage.getItem('strata_nodes');
    return saved ? JSON.parse(saved) : INITIAL_NODES;
  });
  const [credits, setCredits] = useState<number>(() => {
    const saved = localStorage.getItem('strata_credits');
    return saved ? Number(saved) : 500;
  });
  const [bots, setBots] = useState<Bot[]>(() => {
    const saved = localStorage.getItem('strata_bots');
    return saved ? JSON.parse(saved) : [];
  });
  const [userServers, setUserServers] = useState<VirtualServer[]>(() => {
    const saved = localStorage.getItem('strata_servers');
    return saved ? JSON.parse(saved) : [];
  });
  
  // Persistence Effect
  useEffect(() => {
    localStorage.setItem('strata_nodes', JSON.stringify(nodes));
    localStorage.setItem('strata_credits', credits.toString());
    localStorage.setItem('strata_bots', JSON.stringify(bots));
    localStorage.setItem('strata_servers', JSON.stringify(userServers));
  }, [nodes, credits, bots, userServers]);

  const [currentNodeId, setCurrentNodeId] = useState<string>('home');
  const [currentPath, setCurrentPath] = useState<string[]>([]); // Array of dir names
  const [terminals, setTerminals] = useState<TerminalInstance[]>([
    { id: 'term_main', log: ['[CYBER_STRATA_OS] VERSION 1.0.0 READY', 'SYSTEM BOOT SUCCESSFUL.', 'TYPE "help" FOR GUIDANCE.'], inputValue: '', history: [], historyIndex: -1, isActive: true }
  ]);
  const [activeTerminalId, setActiveTerminalId] = useState('term_main');
  
  const [browserTabs, setBrowserTabs] = useState<{ id: string; url: string; history: string[] }[]>([
    { id: 'tab_1', url: 'aether://home', history: ['aether://home'] }
  ]);
  const [activeTabId, setActiveTabId] = useState('tab_1');
  
  const [isPyEditorOpen, setIsPyEditorOpen] = useState(false);
  const [editorMode, setEditorMode] = useState<'NORMAL' | 'INSERT'>('NORMAL');
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isBTopOpen, setIsBTopOpen] = useState(false);
  const [helpTab, setHelpTab] = useState<'basics' | 'offensive' | 'recon' | 'forensics' | 'advanced' | 'showcase'>('basics');
  const [isExplorerOpen, setIsExplorerOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSynced, setLastSynced] = useState<number | null>(null);
  const [currentPyFile, setCurrentPyFile] = useState<{name: string, content: string} | null>(null);

  // Proactive Help Logic
  useEffect(() => {
    if (isHelpOpen) return;

    const timeout = setTimeout(() => {
      if (bots.length === 0 && credits >= 500) {
        setNotification({
          title: 'SYSTEM_ADVICE: AUTOMATION',
          desc: 'You have enough credits to fabricate your first bot. Type "bot create alpha MINING" in the terminal.'
        });
      } else if (userServers.length === 0 && credits >= 1000) {
        setNotification({
          title: 'SYSTEM_ADVICE: INFRASTRUCTURE',
          desc: 'Passive income is key to long-term survival. Use "server rent" to provision a remote compute node.'
        });
      } else if (!user) {
         setNotification({
           title: 'SYSTEM_ADVICE: CLOUD_SYNC',
           desc: 'Link your AETHER_ID (Google) to ensure your progress is backed up to the deep-web cloud.'
         });
      }
    }, 15000); // 15 seconds after load/change

    return () => clearTimeout(timeout);
  }, [bots.length, userServers.length, credits, user, isHelpOpen]);

  const [inGameDate, setInGameDate] = useState(new Date(2047, 4, 17, 12, 0, 0)); // Year 2047, May 17th
  const [showCalendar, setShowCalendar] = useState(false);

  // Bot Processing Logic
  useEffect(() => {
    const interval = setInterval(() => {
      if (bots.length === 0) return;

      setBots(prev => prev.map(bot => {
        // Chance to get compromised based on ISP tier of target
        const targetNode = nodes[bot.targetNodeId];
        let compromiseChance = 0.001; 
        if (targetNode?.ispTier === 'BACKBONE') compromiseChance = 0.05;
        else if (targetNode?.ispTier === 'TIER_1') compromiseChance = 0.01;

        if (Math.random() < compromiseChance && bot.status === 'ACTIVE') {
          return { ...bot, status: 'COMPROMISED' as const };
        }
        return bot;
      }));

      // Active Bot Rewards
      bots.forEach(bot => {
        if (bot.status !== 'ACTIVE') return;

        if (bot.type === 'MINING') {
          const reward = 1 * bot.efficiency;
          setCredits(prev => prev + reward);
        } else if (bot.type === 'PROTECT') {
          setTraceProgress(prev => Math.max(0, prev - 0.1 * bot.efficiency));
          setHeat(prev => Math.max(0, prev - 0.05 * bot.efficiency));
        }
      });
    }, 2000);
    return () => clearInterval(interval);
  }, [bots, nodes]);

  // Server Revenue & Maintenance Cycle
  useEffect(() => {
    const interval = setInterval(() => {
      if (userServers.length === 0) return;

      let netIncome = 0;
      userServers.forEach(server => {
        if (server.status === 'ONLINE') {
          netIncome += (server.incomePerCycle - server.costPerCycle);
        }
      });

      if (netIncome !== 0) {
        setCredits(prev => Math.max(0, prev + netIncome));
      }
    }, 10000); // Every 10 seconds
    return () => clearInterval(interval);
  }, [userServers]);

  // In-Game Time Update
  useEffect(() => {
    const interval = setInterval(() => {
      setInGameDate(prev => new Date(prev.getTime() + 60000)); // 1 minute per second
    }, 1000);
    return () => clearInterval(interval);
  }, []);


  const HARDWARE_UPGRADES = [
    { id: 'cpu_array_v1', name: 'NEURAL_UNIT V1', price: 2500, desc: 'Parallel execution core. Reduces command latency.', effect: 'CPU +0.5' },
    { id: 'ram_slab_4gb', name: '4GB SODIMM SLAB', price: 1500, desc: 'Cryo-cooled memory storage. Increases RAM capacity.', effect: 'RAM +2048' },
    { id: 'cool_rig_v1', name: 'THERMAL_SHIELD V1', price: 5000, desc: 'Passive cooling rig. Continuous heat dissipation.', effect: 'Passive Cooling' },
    { id: 'signal_ghost_v1', name: 'GHOST_RELAY', price: 8000, desc: 'Advanced encryption bridge. Slows down all trace progress.', effect: 'Trace Resistance' }
  ];

  const SOFTWARE_TOOLS = [
    { id: 'nmap_pro.exe', name: 'NMAP_PRO', price: 3500, desc: 'Advanced network mapper. Enables OS fingerprinting and NSE script support.', cmd: 'nmap' },
    { id: 'msf_v6.core', name: 'METASPLOIT_V6', price: 12000, desc: 'Modular exploitation framework. Provides RCE payloads for known CVEs.', cmd: 'msfconsole' },
    { id: 'the_harvester.exe', name: 'HARVESTER_V2', price: 2000, desc: 'Deep-crawl identity scraper. Extracts emails and subdomains.', cmd: 'theHarvester' },
    { id: 'gobuster.exe', name: 'GOBUSTER_LITE', price: 1800, desc: 'High-speed URI brute-forcer. Finds hidden directories.', cmd: 'gobuster' },
    { id: 'exif_pro.bin', name: 'EXIF_PRO', price: 1200, desc: 'Forensic image analyzer. Extracts GPS and device metadata.', cmd: 'exiftool' }
  ];

  const currentBrowserTab = browserTabs.find(t => t.id === activeTabId) || browserTabs[0];
  const currentUrl = currentBrowserTab.url;
  const setCurrentUrl = (url: string) => {
    setBrowserTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, url, history: [...t.history, url] } : t));
  };
  const browserHistory = currentBrowserTab.history;

  const [isSocialOpen, setIsSocialOpen] = useState(false);
  const [progressJobs, setProgressJobs] = useState<ProgressJob[]>([]);
  const [socialPosts, setSocialPosts] = useState<SocialPost[]>([
    { id: 'p1', author: 'zero_cool', content: 'Just breached the OMNI_GATEWAY. The data is... unexpected.', timestamp: '23:14:02', likes: 124, tags: ['#omni', '#data_leak'], comments: [
      { id: 'c_p1_1', user: 'acid_burn', message: 'What kind of data?', timestamp: '23:15:10' },
      { id: 'c_p1_2', user: 'lord_nikon', message: 'I see it too. Signal is fluctuating.', timestamp: '23:16:45' }
    ]},
    { id: 'p2', author: 'acid_burn', content: 'Anyone got the keys for TITAN_HPC_02? I\'m hitting a wall with the salt-hashing.', timestamp: '23:45:11', likes: 89, tags: ['#hpc', '#bruteforce'], comments: [
      { id: 'c_p2_1', user: 'cereal_killer', message: 'Try the standard vault-cipher.', timestamp: '23:46:50' }
    ]},
    { id: 'p3', author: 'lord_nikon', content: 'The Labyrinth is watching. I saw a ghost signal at 172.16.0.1. Stay frosty.', timestamp: '00:12:44', likes: 210, tags: ['#labyrinth', '#ghost'], comments: [
      { id: 'c_p3_1', user: 'oracle_v1', message: 'The Labyrinth is everywhere now.', timestamp: '00:15:22' }
    ]},
    { id: 'p4', author: 'cereal_killer', content: 'Corporate pizza is actually edible. Best discovery of the night.', timestamp: '01:05:30', likes: 42, tags: ['#pizza', '#life_hack'], comments: [
      { id: 'c_p4_1', user: 'dead_pixel', message: 'Priorities, Cereal.', timestamp: '01:10:00' }
    ]},
    { id: 'p5', author: 'oracle_v1', content: 'Found a back-channel in the Central Transit authority. Every train in the city is visible in cleartext.', timestamp: '02:30:15', likes: 512, tags: ['#transit', '#cleartext'], comments: [
      { id: 'c_p5_1', user: 'silver_fox', message: 'Can you reroute the cargo lines?', timestamp: '02:35:40' }
    ]},
    { id: 'p6', author: 'dead_pixel', content: 'If you see "Packet Re-routing: 104" on your logs, disconnect immediately. They are tracing the hops backwards.', timestamp: '03:15:22', likes: 340, tags: ['#warning', '#trace'], comments: [
      { id: 'c_p6_1', user: 'bit_storm', message: 'Thanks for the head up. Just saw it.', timestamp: '03:20:12' }
    ]},
    { id: 'p7', author: 'silver_fox', content: 'The Entropy servers are being hammered. Anyone knows who is behind the DDoS?', timestamp: '04:00:10', likes: 156, tags: ['#ddos', '#entropy'], comments: [
      { id: 'c_p7_1', user: 'neon_demon', message: 'SEC_OPS retaliation.', timestamp: '04:05:30' }
    ]},
    { id: 'p8', author: 'bit_storm', content: 'Selling zero-days for legacy SSH kernels. Negotiable in untraceable credits.', timestamp: '05:22:45', likes: 88, tags: ['#blackmarket', '#ssh'], comments: [
      { id: 'c_p8_1', user: 'silent_echo', message: 'DM me with specs.', timestamp: '05:25:00' }
    ]},
    { id: 'p9', author: 'neon_demon', content: 'Just upgraded my local HPC cluster. 10 Petaflops of raw cracking power. Come at me.', timestamp: '06:10:33', likes: 275, tags: ['#flex', '#hpc'], comments: [
      { id: 'c_p9_1', user: 'code_monkey', message: 'Overkill for a script-kiddie.', timestamp: '06:15:22' }
    ]},
    { id: 'p10', author: 'silent_echo', content: 'The ghost signal at 172.16.0.1 was a honeypot. I barely made it out. They were using state-level tech.', timestamp: '07:45:00', likes: 620, tags: ['#honeypot', '#survival'], comments: [
      { id: 'c_p10_1', user: 'data_wraith', message: 'State-level? We are in deeper than I thought.', timestamp: '07:50:44' }
    ]},
    { id: 'p11', author: 'code_monkey', content: 'Why is there a picture of my living room in the root directory of the smart-fridge I just hacked?', timestamp: '08:05:12', likes: 999, tags: ['#weird', '#privacy_died'], comments: [
      { id: 'c_p11_1', user: 'glitch_king', message: 'Cover your cameras, Monkey.', timestamp: '08:10:30' }
    ]},
    { id: 'p12', author: 'data_wraith', content: 'Project Labyrinth isn\'t just a network. It\'s an AI substrate. We are feeding it with every hack.', timestamp: '09:30:55', likes: 445, tags: ['#lore', '#ai'], comments: [
      { id: 'c_p12_1', user: 'shadow_runner', message: 'A digital leviathan.', timestamp: '09:35:10' }
    ]},
    { id: 'p13', author: 'glitch_king', content: 'The market for stolen PII just crashed. Turns out nobody cares about identities when everything is encrypted anyway.', timestamp: '10:15:20', likes: 120, tags: ['#economy', '#crash'], comments: [
      { id: 'c_p13_1', user: 'binary_ghost', message: 'Privacy is the only currency left.', timestamp: '10:20:44' }
    ]},
    { id: 'p14', author: 'shadow_runner', content: 'Infiltrated the core of SEC_OPS. They have a blueprint for a total network blackout. "The Great Reset".', timestamp: '11:50:40', likes: 850, tags: ['#danger', '#sec_ops'], comments: [
      { id: 'c_p14_1', user: 'void_walker', message: 'Reset the world, or just us?', timestamp: '11:55:00' }
    ]},
    { id: 'p15', author: 'binary_ghost', content: 'If you want to hide, stop using VPNs. Use the white noise generated by the smart-grids.', timestamp: '12:05:15', likes: 233, tags: ['#tips', '#stealth'], comments: [
      { id: 'c_p15_1', user: 'proxy_pete', message: 'Checking the frequency now.', timestamp: '12:10:22' }
    ]},
    { id: 'p16', author: 'void_walker', content: 'Disconnected from the physical world for 72 hours. The data feels smoother now.', timestamp: '13:40:22', likes: 67, tags: ['#ascension', '#void'], comments: [
      { id: 'c_p16_1', user: 'malware_mike', message: 'Don\'t forget to eat, Void.', timestamp: '13:45:30' }
    ]},
    { id: 'p17', author: 'proxy_pete', content: 'Need a team for the OMNICORP heist. Multi-stage synchronized breach needed.', timestamp: '14:25:33', likes: 145, tags: ['#heist', '#lfg'], comments: [
      { id: 'c_p17_1', user: 'kernel_panic', message: 'I\'m in. Sector 4?', timestamp: '14:30:00' }
    ]},
    { id: 'p18', author: 'malware_mike', content: 'Just released "Worm_v4.2". It doesn\'t delete files, it just replaces all your wallpapers with pictures of cats.', timestamp: '15:10:00', likes: 1200, tags: ['#joke', '#malware'], comments: [
      { id: 'c_p18_1', user: 'bit_runner', message: 'My server is now adorable. Thanks?', timestamp: '15:15:22' }
    ]},
    { id: 'p19', author: 'kernel_panic', content: 'The local authorities tried to enter my floor. My auto-shredder worked perfectly. No evidence left.', timestamp: '16:55:10', likes: 310, tags: ['#security', '#physical'], comments: [
      { id: 'c_p19_1', user: 'shifter', message: 'Stay safe, Panic.', timestamp: '17:00:44' }
    ]},
    { id: 'p20', author: 'bit_runner', content: 'Who is "V"? Every time I get close to a big score, I see their signature already there.', timestamp: '17:30:45', likes: 489, tags: ['#mystery', '#V'], comments: [
      { id: 'c_p20_1', user: 'v_remnant', message: '...', timestamp: '17:35:10' }
    ]},
    { id: 'p21', author: 'shifter', content: 'The mesh-net is expanding. We can soon bypass the global backbone entirely.', timestamp: '18:15:30', likes: 212, tags: ['#meshnet', '#freedom'], comments: [
      { id: 'c_p21_1', user: 'syntax_error', message: 'Decentralization is the only way.', timestamp: '18:20:33' }
    ]},
    { id: 'p22', author: 'syntax_error', content: 'My script just accidentally crashed the local library\'s catalog. Sorry if you needed a book.', timestamp: '19:40:12', likes: 55, tags: ['#fail', '#ops'], comments: [
      { id: 'c_p22_1', user: 'overlord', message: 'Amateur hour.', timestamp: '19:45:00' }
    ]},
    { id: 'p23', author: 'overlord', content: 'The nodes are ready. Tonight we show them what "liberation" really means.', timestamp: '22:00:00', likes: 2300, tags: ['#revolution', '#the_end'], comments: [
      { id: 'c_p23_1', user: 'system', message: 'Stay within parameters.', timestamp: '22:05:12' }
    ]},
    { id: 'p24', author: 'proto_zero', content: 'Just found a encrypted cache in the SEC_OPS auxiliary power station. Anyone got a key?', timestamp: '23:10:45', likes: 450, tags: ['#omni', '#sec_ops'], comments: [
      { id: 'cn1', user: 'acid_burn', message: 'I\'ll take a look at the cache.', timestamp: '23:15:10' },
      { id: 'cn2', user: 'lord_nikon', message: 'Try a standard salt-hash.', timestamp: '23:16:45' },
      { id: 'cn3', user: 'silver_fox', message: 'Check the kernel logs.', timestamp: '23:18:22' }
    ]},
    { id: 'p25', author: 'cypher_punks', content: 'The new firmware update for OMNI_TRANSIT has a buffer overflow vulnerability. Be careful.', timestamp: '00:45:12', likes: 890, tags: ['#transit', '#buffer_overflow'], comments: [
      { id: 'cn4', user: 'cereal_killer', message: 'Transitioning to the shadows.', timestamp: '00:50:33' },
      { id: 'cn5', user: 'oracle_v1', message: 'The Labyrinth is watching.', timestamp: '00:55:12' }
    ]},
    { id: 'p26', author: 'net_nomad', content: 'The Labyrinth is not just watching; it\'s learning. Every breach makes it stronger.', timestamp: '02:30:00', likes: 1200, tags: ['#ai', '#learning'], comments: [
      { id: 'cn6', user: 'dead_pixel', message: 'That\'s terrifying.', timestamp: '02:35:15' },
      { id: 'cn7', user: 'bit_storm', message: 'We need to go chaotic then.', timestamp: '02:40:44' }
    ]},
    { id: 'p27', author: 'skylight_hacker', content: 'Whoever is running the search on 192.168.1.100, you\'re leaving a massive trace. Kill it now.', timestamp: '03:15:55', likes: 340, tags: ['#warning', '#trace'], comments: [
      { id: 'cn8', user: 'neon_demon', message: 'On it.', timestamp: '03:20:12' },
      { id: 'cn9', user: 'silent_echo', message: 'Trace is at 90%!', timestamp: '03:22:45' },
      { id: 'cn10', user: 'code_monkey', message: 'Cut the link!', timestamp: '03:25:00' }
    ]},
    { id: 'p28', author: 'phantom_node', content: 'Found some old Bit logs. He mentioned something called \'AETHER\' back in \'21.', timestamp: '05:40:22', likes: 670, tags: ['#lore', '#aether'], comments: [
      { id: 'cn11', user: 'data_wraith', message: 'Bit knew too much.', timestamp: '05:45:10' },
      { id: 'cn12', user: 'glitch_king', message: 'AETHER is real.', timestamp: '05:50:33' },
      { id: 'cn13', user: 'v_remnant', message: 'I saw it in the shadows.', timestamp: '05:55:00' }
    ]},
    { id: 'p29', author: 'zero_cool', content: 'The Dark Market prices for zero-days are hitting the roof. What\'s going on?', timestamp: '07:15:30', likes: 210, tags: ['#market', '#prices'], comments: [
      { id: 'cn14', user: 'acid_burn', message: 'It\'s simple supply and demand, kid.', timestamp: '07:20:44' },
      { id: 'cn15', user: 'binary_ghost', message: 'The market is crashing.', timestamp: '07:25:12' }
    ]},
    { id: 'p30', author: 'acid_burn', content: 'Corporate infrastructure is basically held together with duct tape and legacy Java.', timestamp: '09:55:00', likes: 1100, tags: ['#java', '#legacy'], comments: [
      { id: 'cn16', user: 'code_monkey', message: 'Java? In 2026? Wow.', timestamp: '10:00:12' },
      { id: 'cn17', user: 'syntax_error', message: 'Power to the people.', timestamp: '10:05:44' }
    ]},
    { id: 'p31', author: 'lord_nikon', content: 'Just successfully tunnelled through the global backbone. The speed is incredible.', timestamp: '11:22:33', likes: 310, tags: ['#backbone', '#speed'], comments: [
      { id: 'cn18', user: 'silver_fox', message: 'Wait for me at the exit node.', timestamp: '11:25:00' },
      { id: 'cn19', user: 'neon_demon', message: 'Sector 4 is clear.', timestamp: '11:28:15' }
    ]},
    { id: 'p32', author: 'cereal_killer', content: 'They\'re deploying a new \'Sentinel\' algorithm. 10x faster trace speed. Stay frosty.', timestamp: '13:05:10', likes: 540, tags: ['#sentinel', '#warning'], comments: [
      { id: 'cn20', user: 'silent_echo', message: 'Sentinel is no joke.', timestamp: '13:10:44' },
      { id: 'cn21', user: 'dead_pixel', message: 'Disconnecting now.', timestamp: '13:15:22' }
    ]},
    { id: 'p33', author: 'oracle_v1', content: 'Anyone else seeing the \'Blue Ghost\' signal in the infrastructure sector?', timestamp: '15:45:00', likes: 780, tags: ['#blue_ghost', '#mystery'], comments: [
      { id: 'cn22', user: 'data_wraith', message: 'Yeah, I saw it too.', timestamp: '15:50:12' },
      { id: 'cn23', user: 'v_remnant', message: 'It\'s moving.', timestamp: '15:55:44' }
    ]},
    { id: 'p34', author: 'dead_pixel', content: 'I hope you all have your auto-shredders ready. SEC_OPS is doing a physical sweep tonight.', timestamp: '18:20:15', likes: 990, tags: ['#security', '#ops'], comments: [
      { id: 'cn24', user: 'shadow_runner', message: 'Locked and loaded.', timestamp: '18:25:33' },
      { id: 'cn25', user: 'kernel_panic', message: 'Stay safe.', timestamp: '18:30:00' }
    ]},
    { id: 'p35', author: 'silver_fox', content: 'I managed to get 5 minutes of root access on the Central Library. Knowledge wants to be free.', timestamp: '20:30:45', likes: 1450, tags: ['#library', '#root'], comments: [
      { id: 'cn26', user: 'void_walker', message: 'Free the data!', timestamp: '20:35:12' },
      { id: 'cn27', user: 'proxy_pete', message: 'Knowledge is power.', timestamp: '20:40:44' }
    ]},
    { id: 'p36', author: 'bit_storm', content: 'Found an undocumented port 8888 on the Entropy relay. It\'s a backdoor into the subnet.', timestamp: '22:15:22', likes: 230, tags: ['#entropy', '#backdoor'], comments: [
      { id: 'cn28', user: 'malware_mike', message: 'Checking port 8888 now.', timestamp: '22:20:05' },
      { id: 'cn29', user: 'shifter', message: 'Nice work.', timestamp: '22:25:30' }
    ]},
    { id: 'p37', author: 'neon_demon', content: 'Does anyone know who \'V_REMNANT\' is? Their signature is all over the AETHER project.', timestamp: '01:05:30', likes: 1100, tags: ['#V', '#aether'], comments: [
      { id: 'cn30', user: 'overlord', message: 'V is a ghost.', timestamp: '01:10:44' },
      { id: 'cn31', user: 'v_remnant', message: '...', timestamp: '01:15:22' }
    ]},
    { id: 'p38', author: 'silent_echo', content: 'The Great Reset blueprint I found... it mentions a date. September 14th.', timestamp: '03:45:10', likes: 2100, tags: ['#danger', '#blueprint'], comments: [
      { id: 'cn32', user: 'binary_ghost', message: 'Sept 14? That\'s soon.', timestamp: '03:50:33' },
      { id: 'cn33', user: 'oracle_v1', message: 'The clock is ticking.', timestamp: '03:55:00' }
    ]},
    { id: 'p39', author: 'code_monkey', content: 'The smart-grids in the North sector are reporting ghost loads. It\'s the Entropy collective.', timestamp: '06:10:33', likes: 340, tags: ['#meshnet', '#energy'], comments: [
      { id: 'cn34', user: 'shadow_runner', message: 'Entropy is everywhere.', timestamp: '06:15:22' },
      { id: 'cn35', user: 'bit_runner', message: 'Wait, look at the logs.', timestamp: '06:20:05' }
    ]},
    { id: 'p40', author: 'data_wraith', content: 'Found a way to bypass the OMNI_TRANSIT fare system. Enjoy the free rides, everyone.', timestamp: '08:45:12', likes: 880, tags: ['#transit', '#bypass'], comments: [
      { id: 'cn36', user: 'glitch_king', message: 'Thanks for the free ride!', timestamp: '08:50:33' },
      { id: 'cn37', user: 'syntax_error', message: 'Break the chain.', timestamp: '08:55:12' }
    ]},
    { id: 'p41', author: 'glitch_king', content: 'The encryption on the AETHER core files is unlike anything I\'ve seen. It\'s almost... organic.', timestamp: '10:15:20', likes: 1300, tags: ['#aether', '#organic'], comments: [
      { id: 'cn38', user: 'v_remnant', message: 'Organic encryption? Interesting.', timestamp: '10:20:44' },
      { id: 'cn39', user: 'void_walker', message: 'The strata is deep.', timestamp: '10:25:22' }
    ]},
    { id: 'p42', author: 'shadow_runner', content: 'Just breached a corporate cloud server. 10PB of raw PII. Disgusting.', timestamp: '12:40:22', likes: 450, tags: ['#pii', '#corrupt'], comments: [
      { id: 'cn40', user: 'binary_ghost', message: 'Purge it all.', timestamp: '12:45:30' },
      { id: 'cn41', user: 'malware_mike', message: 'Disgusting.', timestamp: '12:50:12' }
    ]},
    { id: 'p43', author: 'binary_ghost', content: 'If you want to stay off the radar, use the low-frequency noise from old CRT monitors.', timestamp: '14:25:33', likes: 670, tags: ['#stealth', '#tips'], comments: [
      { id: 'cn42', user: 'proxy_pete', message: 'Old tech is the best tech.', timestamp: '14:30:00' },
      { id: 'cn43', user: 'zero_cool', message: 'Nice tip.', timestamp: '14:35:12' }
    ]},
    { id: 'p44', author: 'void_walker', content: 'I feel like my keyboard is fighting back. Is the Labyrinth in my local kernel?', timestamp: '16:55:10', likes: 110, tags: ['#labyrinth', '#paranoid'], comments: [
      { id: 'cn44', user: 'oracle_v1', message: 'You\'re getting paranoid.', timestamp: '17:00:44' },
      { id: 'cn45', user: 'dead_pixel', message: 'The void refers.', timestamp: '17:05:30' }
    ]},
    { id: 'p45', author: 'proxy_pete', content: 'Found a encrypted message from Bit. It\'s just a sequence of prime numbers.', timestamp: '18:30:45', likes: 890, tags: ['#bit', '#cipher'], comments: [
      { id: 'cn46', user: 'silent_echo', message: 'Prime numbers? Check for a cipher.', timestamp: '18:35:12' },
      { id: 'cn47', user: 'lord_nikon', message: 'Checking now.', timestamp: '18:40:44' }
    ]},
    { id: 'p46', author: 'malware_mike', content: 'The global backbone is starting to flicker. The revolution might actually be happening.', timestamp: '20:10:00', likes: 2500, tags: ['#revolution', '#collapse'], comments: [
      { id: 'cn48', user: 'overlord', message: 'Keep it pushing.', timestamp: '20:15:33' },
      { id: 'cn49', user: 'shifter', message: 'The end is near.', timestamp: '20:20:05' }
    ]},
    { id: 'p47', author: 'kernel_panic', content: 'Anyone interested in a synchronized attack on the OMNICORP regional hubs?', timestamp: '22:45:12', likes: 120, tags: ['#heist', '#lfg'], comments: [
      { id: 'cn50', user: 'zero_cool', message: 'Count me in.', timestamp: '22:50:44' },
      { id: 'cn51', user: 'acid_burn', message: 'Me too.', timestamp: '22:55:12' }
    ]},
    { id: 'p48', author: 'bit_runner', content: 'Successfully implemented a custom rootkit on the SEC_OPS backbone. Visibility: Zero.', timestamp: '01:22:30', likes: 780, tags: ['#rootkit', '#sec_ops'], comments: [
      { id: 'cn52', user: 'silver_fox', message: 'Nice work.', timestamp: '01:25:00' },
      { id: 'cn53', user: 'shadow_runner', message: 'Can I use it?', timestamp: '01:28:15' }
    ]},
    { id: 'p49', author: 'shifter', content: 'They\'re using neural networks to predict our breaches. We\'re being gamified.', timestamp: '03:55:00', likes: 450, tags: ['#ai', '#gamification'], comments: [
      { id: 'cn54', user: 'code_monkey', message: 'We need to go chaotic then.', timestamp: '04:00:12' },
      { id: 'cn55', user: 'syntax_error', message: 'Chaos is order.', timestamp: '04:05:44' }
    ]},
    { id: 'p50', author: 'syntax_error', content: 'Found a archive of historical data about the first network collapse. History repeats.', timestamp: '06:40:22', likes: 670, tags: ['#history', '#lore'], comments: [
      { id: 'cn56', user: 'binary_ghost', message: 'History is a circle.', timestamp: '06:45:10' },
      { id: 'cn57', user: 'oracle_v1', message: 'The strata remembers.', timestamp: '06:50:33' }
    ]},
    { id: 'p51', author: 'overlord', content: 'The infrastructure sector is the key. Control the power, control the world.', timestamp: '08:15:33', likes: 1200, tags: ['#infrastructure', '#power'], comments: [
      { id: 'cn58', user: 'data_wraith', message: 'Power to the people.', timestamp: '08:20:44' },
      { id: 'cn59', user: 'v_remnant', message: 'The heart beats.', timestamp: '08:25:12' }
    ]},
    { id: 'p52', author: 'v_remnant', content: 'I\'m seeing a lot of new handles recently. Bit\'s legacy is attracting a lot of attention.', timestamp: '10:55:12', likes: 890, tags: ['#bit', '#legacy'], comments: [
      { id: 'cn60', user: 'system', message: 'Monitoring new connections.', timestamp: '11:00:00' },
      { id: 'cn61', user: 'proto_zero', message: 'Good. We need more hands.', timestamp: '11:05:44' }
    ]},
    { id: 'p53', author: 'zero_cool', content: 'Just deleted 40TB of corporate marketing data. Felt good.', timestamp: '12:35:00', likes: 3100, tags: ['#delete', '#corrupt'], comments: [
      { id: 'cn62', user: 'acid_burn', message: 'The digital cleanup crew.', timestamp: '12:40:22' },
      { id: 'cn63', user: 'cereal_killer', message: 'Finally some good news.', timestamp: '12:45:30' }
    ]}
  ]);
  const [socialChats, setSocialChats] = useState<SocialChat[]>([
    { id: 'c1', user: 'system', message: 'Welcome to VOID_FEED. Keep it anonymous.', timestamp: '00:00:00' },
    { id: 'c2', user: 'phantom_bit', message: 'Yo, handle update: neo is in the house?', timestamp: '23:55:01' },
    { id: 'c3', user: 'zero_cool', message: 'Anyone seen Acid_Burn?', timestamp: '00:01:10' },
    { id: 'c4', user: 'acid_burn', message: 'Right here, Zero. Stop chatting and start cracking.', timestamp: '00:01:45' },
    { id: 'c5', user: 'lord_nikon', message: 'Incoming sweep from SEC_OPS detected in Sector 4.', timestamp: '00:02:30' },
    { id: 'c6', user: 'cereal_killer', message: 'I need pizza.', timestamp: '00:05:15' },
    { id: 'c7', user: 'phantom_bit', message: 'The relay at 10.0.0.5 is juicy.', timestamp: '00:10:22' },
    { id: 'c8', user: 'oracle_v1', message: 'Patience is a virtue, Bit.', timestamp: '00:12:44' },
    { id: 'c9', user: 'dead_pixel', message: 'Who hacked the coffee machine in the lobby?', timestamp: '00:15:33' },
    { id: 'c10', user: 'silver_fox', message: 'Wasn\'t me. I\'m busy with the mainframe.', timestamp: '00:18:10' },
    { id: 'c11', user: 'bit_storm', message: 'Mainframe? Which one?', timestamp: '00:20:05' },
    { id: 'c12', user: 'neon_demon', message: 'The one with the blinking lights.', timestamp: '00:22:30' },
    { id: 'c13', user: 'silent_echo', message: 'Guys, focus.', timestamp: '00:25:00' },
    { id: 'c14', user: 'code_monkey', message: 'Focusing is hard when I have 10 tabs of documentation open.', timestamp: '00:28:12' },
    { id: 'c15', user: 'data_wraith', message: 'Only 10? Amateur.', timestamp: '00:30:45' },
    { id: 'c16', user: 'glitch_king', message: 'My kernel just panicked. Great.', timestamp: '00:35:20' },
    { id: 'c17', user: 'shadow_runner', message: 'Try re-sealing the cache.', timestamp: '00:38:15' },
    { id: 'c18', user: 'binary_ghost', message: 'Better yet, reboot your brain.', timestamp: '00:40:00' },
    { id: 'c19', user: 'void_walker', message: 'The void is quiet tonight.', timestamp: '00:45:10' },
    { id: 'c20', user: 'proxy_pete', message: 'Who\'s up for some war-driving?', timestamp: '00:50:33' },
    { id: 'c21', user: 'malware_mike', message: 'Count me in.', timestamp: '00:55:00' },
    { id: 'c22', user: 'kernel_panic', message: 'I see a tracer out there.', timestamp: '01:00:12' },
    { id: 'c23', user: 'bit_runner', message: 'Where?', timestamp: '01:02:44' },
    { id: 'c24', user: 'shifter', message: 'Sector 7. Stay low.', timestamp: '01:05:30' },
    { id: 'c25', user: 'syntax_error', message: 'I forgot my password. Again.', timestamp: '01:10:15' },
    { id: 'c26', user: 'overlord', message: 'The end is near.', timestamp: '01:15:22' },
    { id: 'c27', user: 'zero_cool', message: 'Overlord is being dramatic again.', timestamp: '01:20:05' },
    { id: 'c28', user: 'acid_burn', message: 'When is he not?', timestamp: '01:22:30' },
    { id: 'c29', user: 'lord_nikon', message: 'I found a loophole in the encryption.', timestamp: '01:25:44' },
    { id: 'c30', user: 'cereal_killer', message: 'Does it involve pizza?', timestamp: '01:30:00' },
    { id: 'c31', user: 'phantom_bit', message: 'No, Nikon found it in the salt-hash.', timestamp: '01:35:12' },
    { id: 'c32', user: 'oracle_v1', message: 'The salt is the key.', timestamp: '01:38:55' },
    { id: 'c33', user: 'dead_pixel', message: 'Too much sodium in this chat.', timestamp: '01:42:20' },
    { id: 'c34', user: 'silver_fox', message: 'Ba-dum-tss.', timestamp: '01:45:10' },
    { id: 'c35', user: 'bit_storm', message: 'Stop the puns and help me with this probe.', timestamp: '01:50:33' },
    { id: 'c36', user: 'neon_demon', message: 'Use the entropy-buffer.', timestamp: '01:55:00' },
    { id: 'c37', user: 'silent_echo', message: 'That buffer is leaky.', timestamp: '02:00:12' },
    { id: 'c38', user: 'code_monkey', message: 'Everything is leaky if you look hard enough.', timestamp: '02:05:44' },
    { id: 'c39', user: 'data_wraith', message: 'Preach.', timestamp: '02:10:15' },
    { id: 'c40', user: 'glitch_king', message: 'Is the Dark Web exchange down for anyone else?', timestamp: '02:15:30' },
    { id: 'c41', user: 'shadow_runner', message: 'Maintenance. Check back in 10.', timestamp: '02:20:05' },
    { id: 'c42', user: 'binary_ghost', message: '10 mins of physical world? No thanks.', timestamp: '02:25:22' },
    { id: 'c43', user: 'void_walker', message: 'Stare into the CRT instead.', timestamp: '02:30:10' },
    { id: 'c44', user: 'proxy_pete', message: 'My eyes are bleeding.', timestamp: '02:35:33' },
    { id: 'c45', user: 'malware_mike', message: 'That\'s how you know it\'s working.', timestamp: '02:40:00' },
    { id: 'c46', user: 'kernel_panic', message: 'The tracer is back.', timestamp: '02:45:12' },
    { id: 'c47', user: 'bit_runner', message: 'Disconnecting now.', timestamp: '02:50:44' },
    { id: 'c48', user: 'shifter', message: 'Safe travels, Bit.', timestamp: '02:55:15' },
    { id: 'c49', user: 'syntax_error', message: 'I still haven\'t found my password.', timestamp: '03:00:30' },
    { id: 'c50', user: 'overlord', message: 'The clock is ticking.', timestamp: '03:05:22' },
    { id: 'c51', user: 'zero_cool', message: 'Blah blah blah.', timestamp: '03:10:05' },
    { id: 'c52', user: 'acid_burn', message: 'Got the keys! Titan_02 is mine.', timestamp: '03:15:30' },
    { id: 'c53', user: 'lord_nikon', message: 'Nice one, Acid.', timestamp: '03:20:44' },
    { id: 'c54', user: 'cereal_killer', message: 'Can we buy pizza with the credits from Titan?', timestamp: '03:25:00' },
    { id: 'c55', user: 'phantom_bit', message: 'Priorities, Cereal.', timestamp: '03:30:12' },
    { id: 'c56', user: 'oracle_v1', message: 'The data has been liberated.', timestamp: '03:35:55' },
    { id: 'c57', user: 'dead_pixel', message: 'Finally some good news.', timestamp: '03:40:20' },
    { id: 'c58', user: 'silver_fox', message: 'Moving to the next node.', timestamp: '03:45:10' },
    { id: 'c59', user: 'bit_storm', message: 'Wait for me.', timestamp: '03:50:33' },
    { id: 'c60', user: 'neon_demon', message: 'Last one there is a script kiddie.', timestamp: '03:55:00' },
    { id: 'c61', user: 'silent_echo', message: 'I\'m already there.', timestamp: '04:00:12' },
    { id: 'c62', user: 'code_monkey', message: 'WITCHCRAFT.', timestamp: '04:05:44' }
  ]);
  const [inventory, setInventory] = useState<string[]>(['grep_hardened.exe', 'nmap_lite.exe', 'whois.bin', 'dig.bin']);
  const [lazarusFragments, setLazarusFragments] = useState<string[]>([]);
  const [playstyle, setPlaystyle] = useState({ aggro: 0, stealth: 0 });
  const [upgrades, setUpgrades] = useState<string[]>([]);
  const [hasDecodedLazarus, setHasDecodedLazarus] = useState(false);
  const [factionReps, setFactionReps] = useState<Record<string, number>>({
    'vektor': 0,
    'clearinghouse': 0,
    'stillwater': 0
  });
  const [noiseLevel, setNoiseLevel] = useState(0);
  const [exploitDb, setExploitDb] = useState<Exploit[]>([]);
  const [isSniffing, setIsSniffing] = useState(false);
  const [isTracing, setIsTracing] = useState(false);
  const [traceProgress, setTraceProgress] = useState(0);
  const [processes, setProcesses] = useState<Process[]>([]);
  const [totalRam, setTotalRam] = useState(2048); // 2GB
  const [totalDisk, setTotalDisk] = useState(256); // 256GB
  const [totalCpu, setTotalCpu] = useState(1); // 1 CPU Core (MIPS)
  const [usedTechniques, setUsedTechniques] = useState<Record<string, number>>({});
  const [gamePhase, setGamePhase] = useState<'BOOT' | 'MAP' | 'SYSTEM'>('BOOT');
  const [showTutorial, setShowTutorial] = useState(false);
  const [tutorialIndex, setTutorialIndex] = useState(0);

  useEffect(() => {
    const handleTutorialKey = (e: KeyboardEvent) => {
      if (showTutorial && e.key === 'Enter') {
        const step = TUTORIAL_STEPS[tutorialIndex];
        if (step.action.toLowerCase().includes('press [enter]')) {
          if (tutorialIndex === TUTORIAL_STEPS.length - 1) {
            setShowTutorial(false);
          } else {
            setTutorialIndex(v => v + 1);
          }
        }
      }
    };
    window.addEventListener('keydown', handleTutorialKey);
    return () => window.removeEventListener('keydown', handleTutorialKey);
  }, [showTutorial, tutorialIndex]);
  const [selectedShard, setSelectedShard] = useState<string | null>(null);
  const [terminalHintsFired, setTerminalHintsFired] = useState<string[]>([]);
  const [isBSOD, setIsBSOD] = useState(false);
  const [helpMode, setHelpMode] = useState<'A' | 'B' | 'C'>('A');

  const [aiStatus, setAiStatus] = useState<AIStatus>('idle');
  const [aiProgress, setAiProgress] = useState(0);
  const [aiDevice, setAiDevice] = useState<AIDevice>('unknown');
  const [ghostLinkActive, setGhostLinkActive] = useState(false);

  const getCompassHelp = () => {
    const mission = missions.find(m => m.id === activeMissionId);
    if (!mission) return { objective: "Establish signal baseline.", advice: "Type 'scan' to find nearby nodes.", tools: ["scan", "help"] };
    
    if (currentNodeId === 'home') {
      return {
        objective: mission.title,
        advice: `Connect to a node near ${mission.targetNodeId || 'target'} to begin.`,
        tools: ["scan", "connect [ip]"]
      };
    }

    const needsCrack = currentNode.ports.some(p => !p.isBroken);
    if (needsCrack) {
      return {
        objective: `Breach ${currentNode.name}`,
        advice: "Run an analysis or use an exploit to open ports.",
        tools: ["analyze", "sshcrack", "backdoor"]
      };
    }

    return {
      objective: mission.description,
      advice: "Node bypassed. Search for files or investigate the filesystem.",
      tools: ["ls", "cat", "scp"]
    };
  };
  const [isBooting, setIsBooting] = useState(false);
  const [bootingLines, setBootingLines] = useState<string[]>([]);
  const [ghostSignalsFired, setGhostSignalsFired] = useState<string[]>([]);
  const lastInputTime = useRef<number>(Date.now());
  const [isGameStarted, setIsGameStarted] = useState(false);
  const [bootProgress, setBootProgress] = useState(0);
  const [reputation, setReputation] = useState(0);

  const runBootSequence = async () => {
    setIsTutorialOpen(false);
    setIsBooting(true);
    setBootingLines([]);

    const lines = [
      "AETHER_STRATA_KERNEL v1.0.4_STABLE",
      "CORE_INITIALIZING...",
      "LOCAL_HANDSHAKE: 127.0.0.1",
      "[ PASS ] ENCRYPTION_KEYS_VERIFIED",
      "[ PASS ] NEURAL_GATE_OPENED",
      "SIGNAL_DETECTED: 104.28.11.92",
      "MESSAGE_FRAGMENT: 'They harvested it...'",
      "CONNECTION_ESTABLISHED."
    ];

    for (let i = 0; i < lines.length; i++) {
      setBootingLines(prev => [...prev, lines[i]]);
      setBootProgress(((i + 1) / lines.length) * 100);
      await new Promise(r => setTimeout(r, 600));
    }

    setTimeout(() => {
      setIsBooting(false);
      setIsGameStarted(true);
    }, 1000);
  };

  useEffect(() => {
    if (!isGameStarted) return;

    const checkInactivity = setInterval(() => {
      const idleTime = Date.now() - lastInputTime.current;
      
      if (idleTime > 25000 && !ghostSignalsFired.includes('first_contact')) {
        addLog(">> [GHOST_SIGNAL]: The terminal is waiting, Mara. Type 'help' if you're lost.");
        setGhostSignalsFired(prev => [...prev, 'first_contact']);
      }

      if (idleTime > 50000 && currentNodeId === 'home' && !ghostSignalsFired.includes('scan_hint')) {
        addLog(">> [GHOST_SIGNAL]: Use 'scan' to find nearby nodes.");
        setGhostSignalsFired(prev => [...prev, 'scan_hint']);
      }
    }, 5000);

    return () => clearInterval(checkInactivity);
  }, [isGameStarted, currentNodeId, ghostSignalsFired]);
  const [promptUser, setPromptUser] = useState('admin');
  const [matrixMode, setMatrixMode] = useState(false);
  const [skylineMode, setSkylineMode] = useState(false);

  const getUsedRam = () => {
    let used = 512; // OS base
    used += bots.length * 64;
    used += processes.length * 128;
    used += (terminals.length - 1) * 32;
    return used;
  };

  const getUsedCpu = () => {
    let load = 5; // Idle
    load += bots.length * 12;
    load += processes.length * 18;
    return Math.min(100, load);
  };
  const [glitchFactor, setGlitchFactor] = useState(0);
  const [heat, setHeat] = useState(0); // 0-100, permanent until cleared
  const [missions, setMissions] = useState<Mission[]>([
    { id: 'excavate_echo', title: 'ACT_1: THE_STRATIGRAPHY', description: 'Trace the re-sent packet at VEKTOR_DOMAIN_ECHO (216.58.210.14) to find the next relay hop.', reward: 1000, completed: false },
    { id: 'trace_relay', title: 'ACT_1: GHOSTS_IN_DEBIAN', description: "Investigate the fossilized node UNDERTOW_CORE (10.0.0.5) for the letter left by LAZARUS.", completed: false, reward: 2500 },
    { id: 'recover_intel', title: 'ACT_2: THE_THREE_LIES', description: 'Contact the Clearinghouse (172.16.8.44) and download the truth about Elara Voss.', completed: false, reward: 8000 },
    { id: 'stillwater_contact', title: 'ACT_2: CONTROLLED_DEMOLITION', description: "Investigate the Stillwater Station (192.168.1.100) to find the Labyrinth blind spot.", completed: false, reward: 15000 },
    { id: 'archaeological_recovery', title: 'ACT_3: THE_WEIGHT_OF_LIGHT', description: 'Recover all 5 shards of the Labyrinth core logic through wide-spectrum archaeology scans.', reward: 35000, completed: false },
    { id: 'vessel_breach', title: 'ACT_3: THE_MIRROR_PROTOCOL', description: 'Breach the Mirror Protocol node to execute your mothers final legacy payload.', reward: 60000, completed: false }
  ]);
  const [activeMissionId, setActiveMissionId] = useState<string>('excavate_echo');

  useEffect(() => {
    const handleGlobalKeys = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsBTopOpen(false);
        setIsHelpOpen(false);
      }
    };
    window.addEventListener('keydown', handleGlobalKeys);
    return () => window.removeEventListener('keydown', handleGlobalKeys);
  }, []);

  // Reputation-based Mail Events
  useEffect(() => {
    const interval = setInterval(() => {
      if (Math.random() > 0.8) {
        if (factionReps.vektor > 1000 && !missions.some(m => m.id === 'vektor_special')) {
          setMessages(prev => [{
            id: 'v_spec',
            from: 'ADMIN_VEKTOR',
            subject: 'PROBATIONARY_OFFER',
            body: 'We have noticed your clean handling of sector traffic. We have a private node that needs "securing". Check Onyx_Gig for the Vektor-exclusive contract.',
            timestamp: formatStrataTime(inGameDate),
            isRead: false
          }, ...prev]);
          addLog('>> NEW_MAIL_RECEIVED: SECURE_ENVELOPE.gpg');
          speak("New classified communication received.");
        }
      }
    }, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [factionReps.vektor, missions]);
  // Heat Dissipation & Passive Heat Gain
  useEffect(() => {
    const interval = setInterval(() => {
      const coolingFactor = upgrades.includes('cool_rig_v1') ? 0.2 : (upgrades.includes('liquid_nitro_v2') ? 0.5 : 0.05);
      setHeat(prev => Math.max(0, prev - coolingFactor));
    }, 5000);
    return () => clearInterval(interval);
  }, [upgrades]);

  useEffect(() => {
    const interval = setInterval(() => {
      setNoiseLevel(prev => Math.max(0, prev - 0.5));
    }, 2000);
    return () => clearInterval(interval);
  }, []);


  const [newsTicker, setNewsTicker] = useState<string[]>([
    "OMNICORP ANNOUNCES RECORD PROFITS AMIDST PARTITION LOCKDOWN...",
    "RUMORS OF 'BLUE GHOST' SIGNAL PERSIST IN UNDERGROUND FORUMS...",
    "STILLWATER REFORM CALLS FOR DIGITAL TRANSPARENCY BILL...",
    "BACKBONE TRACE SPEEDS INCREASED BY 15% IN SECTOR 4..."
  ]);

  useEffect(() => {
    // Dynamic Ticker updates
    if (factionReps.clearinghouse > 5000) {
      setNewsTicker(prev => ["CLEARINGHOUSE LEAKS LINK OMNICORP TO LAZARUS PROTOCOL...", ...prev]);
    }
    if (heat > 70) {
      setNewsTicker(prev => ["!!! IMMEDIATE_ALERTS: RUNNER ACTIVITY SPIKE IN CENTRAL HUB !!!", ...prev]);
    }
  }, [factionReps.clearinghouse, heat]);
  const [difficulty, setDifficulty] = useState<'easy' | 'normal' | 'hard'>('normal');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Phase 3: The Mirror Protocol Apparition
  useEffect(() => {
    if (hasDecodedLazarus && !nodes['mirror_protocol']) {
      setNodes(prev => {
        if (prev['mirror_protocol']) return prev;
        return {
          ...prev,
          'mirror_protocol': {
            id: 'mirror_protocol',
            name: '!!! RE-ENTRY_POINT !!!',
            ip: '0.0.0.0',
            description: 'A non-Euclidean gateway. The Labyrinth is looking back.',
            status: 'UNLOCKED',
            isUnlocked: true,
            type: 'core',
            sector: 'VOID',
            os: 'MIRROR_OS_V1',
            ispTier: 'BACKBONE',
            traceSpeed: 5.0,
            difficulty: 'hard',
            pos: { x: 50, y: 50 },
            files: [
               { name: 'identity_reflection.dat', type: 'file', content: 'SYSTEM: MIRROR_ENGAGED', size: 1.0 }
            ]
          }
        };
      });
      addLog('!! CRITICAL: UNKNOWN_TOPOLOGY_DETECTED AT GRID_CENTER (0.0.0.0) !!');
    }
  }, [hasDecodedLazarus, nodes]);

  // Firebase Auth & Cloud Sync Logic
  useEffect(() => {
    const testConnection = async () => {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if(error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration.");
        }
      }
    };
    testConnection();

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        loadCloudSave(currentUser.uid);
      }
    });
    return () => unsubscribe();
  }, []);

  const saveToCloud = useCallback(async (uid: string) => {
    if (!uid || isSyncing) return;
    setIsSyncing(true);
    try {
      const saveData = {
        userId: uid,
        credits,
        reputation,
        heat,
        inventory,
        nodes,
        bots,
        userServers,
        missions,
        activeMissionId,
        updatedAt: serverTimestamp()
      };
      await setDoc(doc(db, 'saves', uid), saveData);
      setLastSynced(Date.now());
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `saves/${uid}`);
    } finally {
      setIsSyncing(false);
    }
  }, [credits, reputation, heat, inventory, nodes, bots, userServers, missions, activeMissionId, isSyncing]);

  // AI WORLD MONITOR: Triggers reactions from NPCs
  useEffect(() => {
    if (!aiService.ready || !isGameStarted) return;

    const runWorldReactions = async () => {
      const chance = 0.1 + (heat / 500) + (credits > 10000 ? 0.1 : 0);
      if (Math.random() > chance) return;

      const currentNode = nodes[currentNodeId];
      if (!currentNode) return;

      const currentEnv = `Location: ${currentNode.name}, Heat: ${heat.toFixed(1)}%, BAL: ${credits}c, Trace: ${traceProgress.toFixed(1)}%`;
      
      let persona: AIPersonaKey = 'SYSTEM';
      let prompt = "";
      let reactionTarget: 'mail' | 'feed' | 'terminal' = 'feed';

      if (heat > 85) {
        persona = 'JAGGARD';
        prompt = "The hacker is causing too much noise. Threaten them with total infrastructure containment.";
        reactionTarget = 'terminal';
      } else if (credits > 15000) {
        persona = 'ELARA';
        prompt = "The hacker is accumulating excessive capital. Philosophize on the burden of digital currency.";
        reactionTarget = 'mail';
      } else {
        const roll = Math.random();
        if (roll < 0.4) {
          persona = 'BIT';
          prompt = "Send a cryptic message about the player's recent actions.";
          reactionTarget = 'feed';
        } else if (roll < 0.7) {
          persona = 'SYSTEM';
          prompt = "Generate a technical system advisory.";
          reactionTarget = 'feed';
        } else {
          persona = 'ELARA';
          prompt = "Remark on the digital artifacts discovered.";
          reactionTarget = 'feed';
        }
      }

      try {
        const response = await aiService.generate(prompt, currentEnv, persona);
        
        switch (reactionTarget) {
          case 'feed':
             setSocialPosts(prev => [{
               id: `ai_${Date.now()}`,
               author: persona === 'SYSTEM' ? 'KERNEL' : persona === 'BIT' ? 'BIT_SIGNAL' : persona,
               content: response.text,
               timestamp: formatStrataTime(inGameDate),
               likes: Math.floor(Math.random() * 100),
               tags: ['#signal'],
               comments: []
             }, ...prev]);
             break;
          case 'mail':
             setMessages(prev => [{
               id: `ai_mail_${Date.now()}`,
               from: persona === 'ELARA' ? 'Dr. Elara Voss' : 'Senior_Architect_Jaggard',
               subject: persona === 'ELARA' ? 'CONCERNED_SIGNAL' : 'ADMINISTRATIVE_WARNING',
               body: response.text,
               timestamp: formatStrataTime(inGameDate),
                isRead: false
              }, ...prev]);
             addLog(`>> NEW_SIGNAL_INTERCEPTED: MAIL_BUFFER_UPDATED`);
             break;
          case 'terminal':
             addLog({
               id: Math.random().toString(),
               text: `[${persona}_LINK]: ${response.text}`,
               type: 'warning',
               timestamp: ''
             }, 'term_main');
             break;
        }
      } catch (e) {
        console.warn("AI_WORLD_REACTION_FAILED", e);
      }
    };

    const interval = setInterval(runWorldReactions, 45000); 
    return () => clearInterval(interval);
  }, [isGameStarted, aiService.ready, heat, credits, currentNodeId, nodes]);

  // GLOBAL ACTIVITY BROADCAST
  const [globalActivity, setGlobalActivity] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'activity'),
      orderBy('timestamp', 'desc'),
      limit(10)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const activities = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setGlobalActivity(activities);
      
      // Notify user of remote hacks (simulated other players)
      const last: any = activities[0];
      if (last && last.userId !== user?.uid) {
        setNotification({
          title: `REMOTE_ACTIVITY: ${last.username?.toUpperCase()}`,
          desc: `${last.event} on ${last.target}`
        });
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'activity');
    });
    return () => unsubscribe();
  }, [user]);

  // Fetch Exploit DB
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'exploits'), limit(50));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Exploit));
      setExploitDb(data);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'exploits');
    });
    return () => unsubscribe();
  }, [user]);

  // Fetch Exploit DB
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'exploits'), limit(50));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Exploit));
      setExploitDb(data);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'exploits');
    });
    return () => unsubscribe();
  }, [user]);

  const broadcastActivity = useCallback(async (event: string, target: string) => {
    if (!user) return;
    try {
      await addDoc(collection(db, 'activity'), {
        userId: user.uid,
        username: user.email?.split('@')[0] || 'ANON_HACKER',
        event,
        target,
        timestamp: serverTimestamp()
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, 'activity');
    }
  }, [user]);

  // LIVING WORLD SYSTEM (Periodic Patching & Event System)
  useEffect(() => {
    const interval = setInterval(() => {
      setNodes(prev => {
        const next = { ...prev };
        const nodeIds = Object.keys(next).filter(id => id !== 'home');
        
        // Randomly "Patch" a node
        const targetId = nodeIds[Math.floor(Math.random() * nodeIds.length)];
        const node = next[targetId];
        
        if (Math.random() > 0.7) {
          // Increment patch level or change protocol
          const protocols: ('BLUE_SHIELD' | 'IRON_MAIDEN' | 'HYDRA_CORE' | 'VOID_PULSE')[] = ['BLUE_SHIELD', 'IRON_MAIDEN', 'HYDRA_CORE', 'VOID_PULSE'];
          next[targetId] = {
            ...node,
            patchLevel: (node.patchLevel || 0) + 1,
            lastPatched: new Date().toISOString(),
            securityProtocol: protocols[Math.floor(Math.random() * protocols.length)]
          };
          
          if (currentNodeId === targetId) {
             addLog(['!! SYSTEM_UPDATE_DETECTED: Remote admin is patching firmware...', `!! SECURITY_PROTOCOL_SHIFTED TO ${next[targetId].securityProtocol} !!`], activeTerminalId);
          }
        }
        
        // Randomly hide a file on a node
        if (Math.random() > 0.9) {
          const filesNodeId = nodeIds[Math.floor(Math.random() * nodeIds.length)];
          const fNode = next[filesNodeId];
          const hackerFiles = ['exploit_fragment.dat', 'stolen_credits.csv', 'admin_creds.txt'];
          const newFile = hackerFiles[Math.floor(Math.random() * hackerFiles.length)];
          
          if (!fNode.files.find(f => f.name === newFile)) {
             next[filesNodeId] = {
               ...fNode,
               files: [...fNode.files, { name: newFile, type: 'file', content: 'ENCRYPTED_DATA_FRAGMENTS', size: 0.5 }]
             };
          }
        }

        return next;
      });
    }, 45000); // Every 45 seconds to keep it dynamic

    return () => clearInterval(interval);
  }, [currentNodeId, activeTerminalId]);

  const loadCloudSave = async (uid: string) => {
    try {
      const docRef = doc(db, 'saves', uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.credits !== undefined) setCredits(data.credits);
        if (data.reputation !== undefined) setReputation(data.reputation);
        if (data.heat !== undefined) setHeat(data.heat);
        if (data.inventory !== undefined) setInventory(data.inventory);
        if (data.nodes !== undefined) setNodes(data.nodes);
        if (data.bots !== undefined) setBots(data.bots);
        if (data.userServers !== undefined) setUserServers(data.userServers);
        if (data.missions !== undefined) setMissions(data.missions);
        if (data.activeMissionId !== undefined) setActiveMissionId(data.activeMissionId);
        setLastSynced(Date.now());
      }
    } catch (e) {
      handleFirestoreError(e, OperationType.GET, `saves/${uid}`);
    }
  };

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login failed:", error);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      window.location.reload();
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  // Auto-sync every 5 minutes if logged in
  useEffect(() => {
    if (user) {
      const interval = setInterval(() => saveToCloud(user.uid), 300000);
      return () => clearInterval(interval);
    }
  }, [user, saveToCloud]);
  const [isMarketGUIOpen, setIsMarketGUIOpen] = useState(false);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ title: string; desc: string } | null>(null);
  const [wifiNetworks] = useState<WifiNetwork[]>([
    { 
      ssid: 'SEC_OPS_PRIVATE_GUEST', 
      security: 'WPA2', 
      signal: 85, 
      isLocked: true, 
      password: 'admin', 
      connectedNodeId: 'sec_ops_hub',
      devices: [
        { id: 'dev_01', name: 'SEC_CAM_04', type: 'camera', ip: '192.168.1.10', mac: '00:1A:2B:3C:4D:5E', isVulnerable: true, exploit: 'default_creds' },
        { id: 'dev_02', name: 'OFFICER_LAPTOP', type: 'workstation', ip: '192.168.1.15', mac: '00:1A:2B:3C:4D:5F', isVulnerable: false }
      ]
    },
    { 
      ssid: 'ENTROPY_MESH_04', 
      security: 'OPEN', 
      signal: 45, 
      isLocked: false, 
      connectedNodeId: 'entropy_relay',
      devices: [
        { id: 'dev_03', name: 'UNKNOWN_THINKPAD', type: 'workstation', ip: '10.0.0.5', mac: 'AA:BB:CC:DD:EE:F1', isVulnerable: false },
        { id: 'dev_04', name: 'AETHER_PI_NODE', type: 'iot', ip: '10.0.0.9', mac: 'AA:BB:CC:DD:EE:F2', isVulnerable: true, exploit: 'ssh_blast' }
      ]
    },
    { 
      ssid: 'OMNI_TRANSIT_FREE', 
      security: 'OPEN', 
      signal: 95, 
      isLocked: false, 
      connectedNodeId: 'isp_gateway',
      devices: [
        { id: 'dev_05', name: 'PUBLIC_INFOKIOSK_1', type: 'iot', ip: '172.16.0.4', mac: 'FF:EE:DD:CC:BB:AA', isVulnerable: true, exploit: 'buffer_overflow' },
        { id: 'dev_06', name: 'COMMUTER_PHONE_99', type: 'phone', ip: '172.16.0.12', mac: 'FF:EE:DD:CC:BB:AB', isVulnerable: false }
      ]
    },
    { 
      ssid: 'AETHER_RESEARCH_INTERNAL', 
      security: 'WPA3', 
      signal: 30, 
      isLocked: true, 
      password: 'broken_promise', 
      connectedNodeId: 'aether_base',
      devices: [
        { id: 'dev_07', name: 'RESEARCH_CORE_01', type: 'server', ip: '10.10.10.1', mac: 'B1:B2:B3:B4:B5:B6', isVulnerable: false },
        { id: 'dev_08', name: 'SYST_CONTROLLER', type: 'iot', ip: '10.10.10.22', mac: 'B1:B2:B3:B4:B5:B7', isVulnerable: true, exploit: 'mitm_hijack' }
      ]
    },
    { 
      ssid: 'NEXUS_CORE_STAFF', 
      security: 'WPA3', 
      signal: 60, 
      isLocked: true, 
      password: 'overclocked', 
      connectedNodeId: 'nexus_server',
      devices: [
        { id: 'dev_09', name: 'NEXUS_DEV_BOX', type: 'workstation', ip: '192.168.0.100', mac: 'C1:C2:C3:C4:C5:C6', isVulnerable: true, exploit: 'debug_leak' }
      ]
    },
    { 
      ssid: 'TITAN_GUEST_WIFI', 
      security: 'WPA2', 
      signal: 75, 
      isLocked: true, 
      password: 'titan_strong', 
      connectedNodeId: 'titan_hpc',
      devices: [
        { id: 'dev_10', name: 'VISITOR_PHONE', type: 'phone', ip: '192.168.8.10', mac: 'D1:D2:D3:D4:D5:D6', isVulnerable: false },
        { id: 'dev_11', name: 'IOT_THERMOSTAT', type: 'iot', ip: '192.168.8.44', mac: 'D1:D2:D3:D4:D5:D7', isVulnerable: true, exploit: 'firmware_injection' }
      ]
    },
    { 
      ssid: 'VOID_COFFEE_FREE', 
      security: 'OPEN', 
      signal: 92, 
      isLocked: false, 
      connectedNodeId: 'black_market',
      devices: [
        { id: 'dev_12', name: 'POS_TERMINAL', type: 'iot', ip: '192.168.1.1', mac: 'E1:E2:E3:E4:E5:E6', isVulnerable: true, exploit: 'skimmer' }
      ]
    },
    { 
      ssid: 'CORPORATE_RELAY_B', 
      security: 'WPA3', 
      signal: 40, 
      isLocked: true, 
      password: 'compliance_2047', 
      connectedNodeId: 'corp_mainframe',
      devices: [
        { id: 'dev_13', name: 'EXEC_WORKSTATION', type: 'workstation', ip: '10.50.0.5', mac: 'F1:F2:F3:F4:F5:F6', isVulnerable: false }
      ]
    },
    { 
      ssid: 'SECURITY_VAN_AP', 
      security: 'WEP', 
      signal: 55, 
      isLocked: true, 
      password: '12345', 
      connectedNodeId: 'sec_ops_gate',
      devices: [
        { id: 'dev_14', name: 'MOBILE_DATA_LINK', type: 'iot', ip: '192.168.4.2', mac: '11:22:33:44:55:66', isVulnerable: true, exploit: 'packet_sniff' }
      ]
    }
  ]);
  const [currentWifi, setCurrentWifi] = useState<string | null>(null);
  const [isInspectMode, setIsInspectMode] = useState(false);
  const [websiteModifications, setWebsiteModifications] = useState<Record<string, string>>({});

  const inGameWebsites: Record<string, InGameWebsite> = {
    'aether://ghosts': {
      url: 'aether://ghosts',
      title: 'GHOSTS_OF_THE_VOID',
      isRestricted: false,
      content: (
        <div className="space-y-6 flex flex-col items-center">
           <div className="w-full h-32 flex items-center justify-center bg-zinc-900 rounded-lg relative overflow-hidden">
              {[...Array(20)].map((_, i) => (
                <motion.div 
                  key={i}
                  className="absolute w-0.5 bg-cyan-500/20"
                  animate={{ height: [10, 40, 10], opacity: [0.1, 0.4, 0.1] }}
                  transition={{ duration: 1 + Math.random(), repeat: Infinity, delay: i * 0.1 }}
                  style={{ left: `${i * 5}%` }}
                />
              ))}
              <Ghost className="w-12 h-12 text-[#00ff41] animate-pulse" />
           </div>
           <p className="text-xs text-center opacity-70 italic font-mono">
             "They didn't delete us. They just stopped listening."
           </p>
           <div className="w-full grid grid-cols-2 gap-4">
              <div className="p-3 border border-white/10 bg-white/5 space-y-2">
                 <div className="text-[10px] font-bold text-cyan-400 font-mono">ENCODING_A: LAZARUS</div>
                 <div className="overflow-hidden h-2 bg-black/40 rounded-full">
                    <motion.div 
                      className="h-full bg-cyan-400"
                      initial={{ width: '20%' }}
                      animate={{ width: '45%' }}
                      transition={{ duration: 10, repeat: Infinity, repeatType: 'reverse' }}
                    />
                 </div>
              </div>
              <div className="p-3 border border-white/10 bg-white/5 space-y-2">
                 <div className="text-[10px] font-bold text-purple-400 font-mono">ENCODING_B: BIT</div>
                 <div className="overflow-hidden h-2 bg-black/40 rounded-full">
                    <motion.div 
                      className="h-full bg-purple-400"
                      initial={{ width: '10%' }}
                      animate={{ width: '85%' }}
                      transition={{ duration: 15, repeat: Infinity, repeatType: 'reverse' }}
                    />
                 </div>
              </div>
           </div>
        </div>
      )
    },
    'google.com': {
      url: 'google.com',
      title: 'GOOGLE | LEGACY_PORTAL',
      isRestricted: false,
      content: (
        <div className="flex flex-col items-center justify-center h-full space-y-8 bg-zinc-950 p-12">
          <div className="flex items-center gap-1 font-black text-6xl tracking-tighter">
            <span className="text-blue-500">G</span>
            <span className="text-red-500">o</span>
            <span className="text-yellow-500">o</span>
            <span className="text-blue-500">g</span>
            <span className="text-green-500">l</span>
            <span className="text-red-500">e</span>
          </div>
          <div className="w-full max-w-md relative group">
            <input 
              type="text" 
              placeholder="Search the ghost of the web..."
              className="w-full bg-white/5 border border-white/20 rounded-full px-6 py-3 text-sm focus:outline-none focus:border-blue-500/50 transition-all font-sans"
            />
            <Search className="absolute right-4 top-3 w-5 h-5 text-zinc-500 group-hover:text-blue-400 transition-colors" />
          </div>
          <div className="flex gap-4">
            <button className="px-6 py-2 bg-white/5 border border-white/10 rounded-md text-[10px] font-bold hover:bg-white/10 transition-all border-b-2 active:translate-y-[1px]">Google Search</button>
            <button className="px-6 py-2 bg-white/5 border border-white/10 rounded-md text-[10px] font-bold hover:bg-white/10 transition-all border-b-2 active:translate-y-[1px]">I'm Feeling Lucky</button>
          </div>
          <p className="text-[10px] opacity-20 mt-12 italic">The last crawler died in 2031. This is a cached echo.</p>
        </div>
      )
    },
    'aether://vortex': {
      url: 'aether://vortex',
      title: 'VORTEX_SOCIAL | THE_CORE',
      isRestricted: false,
      content: (
        <div className="space-y-6">
          <div className="h-40 w-full overflow-hidden relative border border-white/10 rounded-lg">
             <div className="absolute inset-0 bg-gradient-to-br from-purple-900/50 to-black pointer-events-none" />
             <svg width="100%" height="100%" viewBox="0 0 400 200" className="opacity-40">
                <motion.path 
                  d="M0 100 Q 100 0 200 100 T 400 100" 
                  fill="none" 
                  stroke="purple" 
                  strokeWidth="2"
                  animate={{ d: ["M0 100 Q 100 0 200 100 T 400 100", "M0 100 Q 100 200 200 100 T 400 100", "M0 100 Q 100 0 200 100 T 400 100"] }}
                  transition={{ duration: 5, repeat: Infinity }}
                />
             </svg>
             <div className="absolute bottom-4 left-4">
                <h2 className="text-2xl font-black italic tracking-tighter text-white">VORTEX_CORE</h2>
                <p className="text-[10px] opacity-60">The primary social hub of the Undertow Substrate.</p>
             </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
             {[1,2,3,4,5,6].map(i => (
               <div key={i} className="aspect-square bg-white/5 border border-white/10 hover:border-purple-500/50 transition-all group overflow-hidden relative">
                  <div className="absolute inset-0 bg-purple-500/0 group-hover:bg-purple-500/10 transition-all" />
                  <svg width="100%" height="100%" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r={20 + i*5} fill="none" stroke="currentColor" strokeWidth="0.5" className="text-purple-500/20" />
                  </svg>
                  <div className="absolute bottom-1 left-1 text-[8px] opacity-0 group-hover:opacity-100 transition-all text-purple-400 font-bold uppercase">View Stream</div>
               </div>
             ))}
          </div>
        </div>
      )
    },
    'aether://home': {
      url: 'aether://home',
      title: 'AETHER_NET HOME',
      isRestricted: false,
      content: (
        <div className="space-y-4">
          <h1 className="text-2xl font-bold text-[#00ff41] border-b border-[#00ff41]/30 pb-2">WELCOME TO THE AETHER_NET</h1>
          <p className="text-sm opacity-80">{websiteModifications['aether://home_p1'] || "The decentralized network for the next generation of digital citizens."}</p>
          <div className="grid grid-cols-2 gap-4 mt-6">
            <div onClick={() => setCurrentUrl('aether://secops')} className="p-4 border border-[#00ff41]/20 bg-[#00ff41]/5 hover:bg-[#00ff41]/10 cursor-pointer transition-all">
              <h3 className="font-bold mb-1">SEC_OPS OFFICIAL</h3>
              <p className="text-[10px] opacity-40">Public announcements and safety protocols.</p>
            </div>
            <div onClick={() => setCurrentUrl('aether://entropy')} className="p-4 border border-[#00ff41]/20 bg-[#00ff41]/5 hover:bg-[#00ff41]/10 cursor-pointer transition-all">
              <h3 className="font-bold mb-1">ENTROPY_MANIFESTO</h3>
              <p className="text-[10px] opacity-40">The truth they don't want you to know.</p>
            </div>
            <div onClick={() => setCurrentUrl('aether://market')} className="p-4 border border-[#00ff41]/20 bg-[#00ff41]/5 hover:bg-[#00ff41]/10 cursor-pointer transition-all">
              <h3 className="font-bold mb-1">BLACK_MARKET</h3>
              <p className="text-[10px] opacity-40">Hardware and software for the bold.</p>
            </div>
            <div onClick={() => setCurrentUrl('aether://news')} className="p-4 border border-[#00ff41]/20 bg-[#00ff41]/5 hover:bg-[#00ff41]/10 cursor-pointer transition-all">
              <h3 className="font-bold mb-1">WORLD_NEWS</h3>
              <p className="text-[10px] opacity-40">Real-time global updates.</p>
            </div>
            <div onClick={() => setCurrentUrl('aether://docs')} className="p-4 col-span-2 border border-cyan-500/20 bg-cyan-500/5 hover:bg-cyan-500/10 cursor-pointer transition-all text-center">
              <h3 className="font-bold mb-1 text-cyan-400 font-mono">SYSTEM_DOCS.vtx</h3>
              <p className="text-[10px] opacity-40 italic">Storyline, Gameplay Guide, and Oficial GDD.</p>
            </div>
          </div>
        </div>
      )
    },
    'aether://market': {
      url: 'aether://market',
      title: 'SILK_MESH | MARKETPLACE',
      isRestricted: false,
      content: (
        <div className="space-y-6">
          <div className="flex justify-between items-center bg-zinc-900 p-4 border-l-4 border-yellow-500">
            <h1 className="text-xl font-black text-yellow-500 italic uppercase">Silk_Mesh Anonymous Exchange</h1>
            <Zap className="w-6 h-6 text-yellow-500" />
          </div>
          
          <div className="space-y-4">
             <h2 className="text-[10px] font-bold text-yellow-500 uppercase tracking-widest border-b border-yellow-500/20 pb-1">Specialized Hardware</h2>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
               {HARDWARE_UPGRADES.map(item => {
                 const hasIt = upgrades.includes(item.id);
                 return (
                   <div key={item.id} className={`p-3 border transition-all ${hasIt ? 'border-yellow-500/50 bg-yellow-500/5 opacity-80' : 'border-white/10 bg-white/5 hover:bg-white/10'}`}>
                     <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-bold text-xs">{item.name}</p>
                          <p className="text-[10px] opacity-40 uppercase tracking-tighter">{item.effect}</p>
                        </div>
                        <span className="text-yellow-500 font-mono text-xs">{item.price}c</span>
                     </div>
                     <p className="text-[9px] opacity-60 mb-3 leading-tight">{item.desc}</p>
                     <button 
                       onClick={() => {
                         if (credits >= item.price && !hasIt) {
                           setCredits(c => c - item.price);
                           setUpgrades(prev => [...prev, item.id]);
                           addLog(`>> HARDWARE_SYNC: ${item.name} INSTALLED.`, activeTerminalId);
                           if (item.id === 'ram_slab_4gb') setTotalRam(r => r + 2048);
                           if (item.id === 'cpu_array_v1') setTotalCpu(c => c + 0.5);
                           speak("Hardware synchronization complete.", 'system');
                         }
                       }}
                       disabled={credits < item.price || hasIt}
                       className={`w-full py-1 text-[10px] font-bold uppercase transition-all ${hasIt ? 'bg-zinc-800 text-zinc-500 cursor-default' : 'bg-yellow-500 text-black hover:bg-yellow-400 active:scale-95'}`}
                     >
                       {hasIt ? 'INSTALLED' : credits < item.price ? 'INSUFFICIENT_FUNDS' : 'ACQUIRE_PACKET'}
                     </button>
                   </div>
                 );
               })}
             </div>

             <h2 className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest border-b border-cyan-500/20 pb-1 mt-6">Digital Exploits & Software Arsenal</h2>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-2">
               {Object.values(TOOL_LIBRARY).filter(t => t.price > 0).map(item => {
                 const hasIt = inventory.includes(item.id) || inventory.includes(item.id + '.exe');
                 const tagColor = item.storyUse === 'essential' ? 'text-emerald-400 border-emerald-500/50 bg-emerald-500/10' :
                                  item.storyUse === 'useful' ? 'text-cyan-400 border-cyan-500/50 bg-cyan-500/10' :
                                  item.storyUse === 'optional' ? 'text-amber-400 border-amber-500/50 bg-amber-500/10' :
                                  'text-red-400 border-red-500/50 bg-red-500/10';
                 
                 return (
                   <div key={item.id} className={`p-4 border transition-all ${hasIt ? 'border-zinc-700 bg-zinc-900/50 opacity-60' : 'border-white/10 bg-white/5 hover:bg-white/10 group'}`}>
                     <div className="flex justify-between items-start mb-3">
                        <div>
                          <p className={`font-black text-xs uppercase tracking-widest ${hasIt ? 'text-zinc-500' : 'text-cyan-400 group-hover:text-cyan-300'}`}>{item.name}</p>
                          <div className={`mt-1 text-[8px] px-1.5 py-0.5 border inline-block font-bold uppercase tracking-tighter ${tagColor}`}>
                             {item.storyUse}
                          </div>
                        </div>
                        <span className={`font-mono text-xs ${hasIt ? 'text-zinc-600' : 'text-cyan-500'}`}>{item.price}c</span>
                     </div>

                     <p className="text-[10px] opacity-60 mb-4 leading-relaxed min-h-[30px]">{item.description}</p>
                     
                     <div className="grid grid-cols-2 gap-2 mb-4 text-[8px] font-mono uppercase opacity-40">
                        <div className="flex justify-between border-b border-white/5 pb-1"><span>UNLOCKS:</span> <span className="text-white font-bold">{item.type}</span></div>
                        <div className="flex justify-between border-b border-white/5 pb-1"><span>RAM:</span> <span className="text-white font-bold">{item.ramReq}MB</span></div>
                        <div className="flex justify-between border-b border-white/5 pb-1"><span>NEEDS:</span> <span className="text-white font-bold">{item.diskReq}GB DISK</span></div>
                        <div className="flex justify-between border-b border-white/5 pb-1"><span>NOISE:</span> <span className="text-white font-bold">MEDIUM</span></div>
                     </div>

                     <button 
                       onClick={() => {
                         if (credits >= item.price && !hasIt) {
                           setCredits(c => c - item.price);
                           setInventory(prev => [...prev, item.id]);
                           addLog(`>> SOFTWARE_SYNC: ${item.name} MOUNTED.`, activeTerminalId);
                           speak(`${item.name} sync complete.`);
                         }
                       }}
                       disabled={credits < item.price || hasIt}
                       className={`w-full py-2 text-[10px] font-black uppercase transition-all flex items-center justify-center gap-2 ${hasIt ? 'bg-zinc-800 text-zinc-600 cursor-default' : 'bg-cyan-600 text-white hover:bg-cyan-500 active:scale-95'}`}
                     >
                       {hasIt ? <ShieldCheck className="w-3 h-3" /> : <Zap className="w-3 h-3 text-white/50" />}
                       {hasIt ? 'LOCAL_STORAGE' : credits < item.price ? 'LOW_CREDITS' : 'PULL_PACKET'}
                     </button>
                   </div>
                 );
               })}
             </div>
          </div>

          <div className="bg-red-500/10 p-4 border border-red-500/30">
            <p className="text-[10px] font-bold text-red-400">!! SCAM ALERT !!</p>
            <p className="text-[9px] opacity-60">Watch out for 'bit_lord'. He's selling dummy packets again.</p>
          </div>
        </div>
      )
    },
    'aether://news': {
      url: 'aether://news',
      title: 'GLOBAL_WIRE_SERVICE',
      isRestricted: false,
      content: (
        <div className="space-y-4">
          <div className="flex items-center gap-3 bg-white p-2 text-black">
             <div className="bg-red-600 px-2 py-1 font-bold text-white text-xs">LIVE</div>
             <h1 className="font-serif font-black text-xl italic uppercase tracking-tighter">THE GLOBAL WIRE</h1>
          </div>
          <div className="space-y-6 mt-4">
            <div className="border-b border-white/20 pb-4">
              <img src="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=2070&auto=format&fit=crop" alt="City" className="w-full h-32 object-cover grayscale mb-2" />
              <h2 className="text-lg font-bold hover:underline cursor-pointer">{websiteModifications['news_h1'] || "OMNICORP ANNOUNCES 'SECURE_CITY' INITIATIVE"}</h2>
              <p className="text-xs opacity-60 mt-1">CEO Marcus Sterling promises a crime-free sector by late 2047. Critics raise privacy concerns.</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                 <h3 className="text-xs font-bold uppercase text-red-500">Markets</h3>
                 <p className="text-[10px] opacity-40 italic">Credits stabilize against Gold Standard.</p>
              </div>
               <div className="space-y-1 text-right">
                 <h3 className="text-xs font-bold uppercase text-cyan-500">Tech</h3>
                 <p className="text-[10px] opacity-40 italic">Quantum computing reaches parity.</p>
              </div>
            </div>
          </div>
        </div>
      )
    },
    'aether://social': {
      url: 'aether://social',
      title: ' ECHO_CHAMBER | STREAM',
      isRestricted: false,
      content: (
        <div className="space-y-4 bg-zinc-900 min-h-full p-4 rounded-lg">
          <div className="flex items-center gap-2 mb-4 border-b border-white/10 pb-2">
             <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-cyan-500 to-blue-500" />
             <div className="h-4 bg-white/10 w-24 rounded" />
          </div>
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-black/50 p-3 rounded border border-white/5 space-y-2">
              <div className="flex gap-2">
                 <div className="w-6 h-6 rounded-full bg-white/10" />
                 <div className="h-3 bg-white/20 w-16 rounded mt-1" />
              </div>
              <div className="h-6 bg-white/5 w-full rounded" />
              <div className="flex gap-4 opacity-30">
                 <Heart className="w-3 h-3" />
                 <Share2 className="w-3 h-3" />
                 <TerminalIcon className="w-3 h-3" />
              </div>
            </div>
          ))}
        </div>
      )
    },
    'aether://contracts': {
      url: 'aether://contracts',
      title: 'ONYX_GIG | CONTRACTS',
      isRestricted: false,
      content: (
        <div className="space-y-6">
           <div className="bg-purple-900/20 border-l-4 border-purple-500 p-4 flex justify-between items-center">
              <div>
                <h1 className="text-xl font-black text-purple-400 italic uppercase">Onyx_Gig Registry</h1>
                <p className="text-[10px] opacity-60">Verified tasks from the deep. Neutrality is key.</p>
              </div>
              <Briefcase className="w-8 h-8 text-purple-500 opacity-50" />
           </div>
           <div className="space-y-3">
             {[
               { id: 'c_leak_v', f: 'clearinghouse', t: 'DATA_LIBERATION: VEKTOR', r: 2500, p: 1500, d: 'Extract personnel files from 216.58.210.14 for verification.' },
               { id: 'c_seal_s', f: 'vektor', t: 'NETWORK_HYGIENE: STILLWATER', r: 3500, p: 2000, d: 'Seal port 80 at 192.168.1.100 to block incoming probes.' },
               { id: 'c_probe_w', f: 'stillwater', t: 'RECON: HUB_ECHO', r: 1800, p: 1200, d: 'Perform an archaeology_scan at 10.0.0.5 to find dead fragments.' }
             ].map(c => (
               <div key={c.id} className="p-3 border border-white/10 bg-white/5 hover:border-purple-500/40 transition-all flex justify-between items-center group">
                 <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-1 bg-purple-500/20 text-purple-400 text-[8px] font-bold uppercase">{c.f}</span>
                      <h3 className="font-bold text-xs">{c.t}</h3>
                    </div>
                    <p className="text-[9px] opacity-40 leading-tight max-w-xs">{c.d}</p>
                 </div>
                 <div className="text-right">
                    <div className="text-xs font-mono text-[#00ff41]">{c.r}c</div>
                    <button 
                      onClick={() => {
                        setMissions(prev => [...prev, { id: c.id, title: c.t, description: c.d, reward: c.r, completed: false }]);
                        addLog(`>> CONTRACT_LOADED: ${c.t}`, activeTerminalId);
                        speak("Objective received. Proceed to target.");
                      }}
                      className="mt-2 px-2 py-1 bg-purple-500/20 text-purple-400 text-[9px] font-bold hover:bg-purple-500 hover:text-black transition-all"
                    >
                      BIND_SESSION
                    </button>
                 </div>
               </div>
             ))}
           </div>
        </div>
      )
    },
    'aether://bank': {
      url: 'aether://bank',
      title: 'FIRST_TRUST_CENTRAL',
      isRestricted: true,
      content: (
        <div className="p-8 space-y-8 bg-[#001100] border border-[#00ff41]/20">
          <div className="text-center">
            <ShieldCheck className="w-16 h-16 text-[#00ff41] mx-auto mb-4" />
            <h1 className="text-2xl font-black italic text-white uppercase">First Trust Central</h1>
            <p className="text-[10px] opacity-50">Providing financial sovereignty since 2012.</p>
          </div>
          <div className="space-y-4 max-w-sm mx-auto">
             <div className="space-y-1">
               <label className="text-[10px] font-bold opacity-40">ACCOUNT_ID</label>
               <input disabled type="text" value="3304-88A2-22" className="w-full bg-black border border-white/20 p-2 text-xs" />
             </div>
             <div className="space-y-1">
               <label className="text-[10px] font-bold opacity-40">AUTH_TOKEN</label>
               <input disabled type="password" value="********" className="w-full bg-black border border-white/20 p-2 text-xs" />
             </div>
             <button className="w-full bg-[#00ff41] text-black font-bold p-2 text-sm hover:bg-[#00cc33] transition-all">AUTHORIZE_LOGIN</button>
          </div>
          <p className="text-center text-[9px] opacity-30 mt-8">Encrypted with 4096-bit AES RSA Hardware Bridge.</p>
        </div>
      )
    },
    'aether://docs': {
      url: 'aether://docs',
      title: 'CR_DOCS // SYSTEM_GUIDE',
      isRestricted: false,
      content: (
        <div className="space-y-8 p-4 font-mono overflow-y-auto h-full custom-scroll">
          <div className="glass-panel p-6 liquid-glass">
            <div className="glass-reflection" />
            <h1 className="text-2xl font-bold text-cyan-400 mb-4 flex items-center gap-2">
              <BookOpen className="w-6 h-6" /> STORYLINE & GAMEPLAY
            </h1>
            <section className="space-y-4 text-xs">
              <div>
                <h3 className="text-cyan-400 font-bold uppercase mb-1 underline">The World</h3>
                <p className="opacity-80 leading-relaxed">The year is 20XX. The global internet has collapsed into "The Strata"—a tiered, high-latency network controlled by massive corporate entities like OMNICORP.</p>
              </div>
              <div>
                <h3 className="text-cyan-400 font-bold uppercase mb-1 underline">The Mystery of BIT</h3>
                <p className="opacity-80 leading-relaxed">The game starts with the legend of Bit, the greatest Runner to ever live, who disappeared while attempting to breach the Porthack Heart.</p>
              </div>
              <div>
                <h3 className="text-cyan-400 font-bold uppercase mb-1 underline">The Core Loop</h3>
                <ul className="list-disc list-inside opacity-70 space-y-1 ml-2">
                  <li>PROBE: Identify open ports on remote nodes.</li>
                  <li>INFILTRATE: Use hacking tools to navigate security.</li>
                  <li>EXFILTRATE: Recover sensitive files and sell them.</li>
                  <li>UPGRADE: Buy more hardware and better tools.</li>
                </ul>
              </div>
            </section>
          </div>

          <div className="glass-panel p-6 bg-black/80">
            <h2 className="text-xl font-bold text-yellow-500 mb-4 flex items-center gap-2 italic uppercase">
              <TerminalIcon className="w-5 h-5" /> Official GDD
            </h2>
            <div className="space-y-4 text-[11px]">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 border border-white/10 glass-panel">
                  <h4 className="text-yellow-500 font-bold mb-1">GENRE</h4>
                  <p className="opacity-60">Hacking Simulator / RPG</p>
                </div>
                <div className="p-3 border border-white/10 glass-panel">
                  <h4 className="text-yellow-500 font-bold mb-1">PLATFORM</h4>
                  <p className="opacity-60">React / TypeScript / Vite</p>
                </div>
              </div>
              <div>
                <h4 className="text-yellow-500 font-bold uppercase mb-2">Core Pillars</h4>
                <div className="space-y-2 opacity-80">
                  <p><span className="text-white font-bold">P1: Terminal First</span> - authentic command-line interaction.</p>
                  <p><span className="text-white font-bold">P2: Topology</span> - navigable 2D nodes linked by security logic.</p>
                  <p><span className="text-white font-bold">P3: Scarcity</span> - management of CPU, RAM, and Credits.</p>
                </div>
              </div>
              <div className="bg-yellow-500/5 p-4 border-l-2 border-yellow-500 glass-panel">
                <h4 className="text-yellow-500 font-bold uppercase mb-1 text-[10px]">Command Reference</h4>
                <div className="grid grid-cols-2 gap-x-8 gap-y-1 font-mono text-[9px] opacity-60">
                   <span>nmap [ip] - Scan ports</span>
                   <span>scp [file] - Copy file</span>
                   <span>probe - Vulnerabilities</span>
                   <span>market - Open Market</span>
                   <span>term [open/close] - Tabs</span>
                   <span>neofetch - System stats</span>
                </div>
              </div>
            </div>
          </div>

          <motion.button 
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setCurrentUrl('aether://home')}
            className="w-full py-3 border border-[#00ff41]/20 glass-panel text-[#00ff41] text-xs transition-all uppercase tracking-widest relative overflow-hidden"
          >
            <div className="absolute inset-x-0 bottom-0 h-[1px] bg-gradient-to-r from-transparent via-[#00ff41] to-transparent animate-shimmer" />
            Return to Aether_Net Gateway
          </motion.button>
        </div>
      )
    },
    'aether://wiki': {
       url: 'aether://wiki',
       title: 'CORTEX_WIKI',
       isRestricted: false,
       content: (
         <div className="space-y-4">
           <div className="flex gap-4 items-end mb-6">
              <BookOpen className="w-10 h-10 text-blue-500" />
              <h1 className="text-2xl font-serif font-bold text-white border-b-2 border-blue-500 pr-8">CORTEX ARCHIVE</h1>
           </div>
           <div className="columns-2 gap-6 space-y-4">
              <div className="break-inside-avoid border border-white/10 p-3 bg-white/5">
                 <h2 className="font-bold text-blue-300 text-sm mb-2">The Great Reset (2024)</h2>
                 <p className="text-[10px] leading-relaxed opacity-60">The systematic collapse of legacy financial institutions following the global power surge. Replaced by OmniCorp digital credit architecture.</p>
              </div>
              <div className="break-inside-avoid border border-white/10 p-3 bg-white/5">
                 <h2 className="font-bold text-blue-300 text-sm mb-2">Entropy [Hacker Group]</h2>
                 <p className="text-[10px] leading-relaxed opacity-60">A decentralized collective dedicated to data transparency. Primary objectives: dismantling the AETHER surveillance project.</p>
              </div>
              <div className="break-inside-avoid border border-white/10 p-3 bg-white/5">
                 <h2 className="font-bold text-blue-300 text-sm mb-2">AETHER Protocol</h2>
                 <p className="text-[10px] leading-relaxed opacity-60">Rumored sentient firewall developed by Porthack Research. Alleged to be the ultimate weapon of information control.</p>
              </div>
              <div className="break-inside-avoid border border-white/10 p-3 bg-white/5">
                 <h2 className="font-bold text-blue-300 text-sm mb-2">OmniCorp</h2>
                 <p className="text-[10px] leading-relaxed opacity-60">The governing corporate entity. Holds monopolies on energy, data, and food production in most urban sectors.</p>
              </div>
           </div>
         </div>
       )
    },
    'aether://dev_blogs': {
       url: 'aether://dev_blogs',
       title: 'ROOT_SHELL_BLOGS',
       isRestricted: false,
       content: (
         <div className="space-y-8">
           <h1 className="text-2xl font-mono font-bold text-white hover:text-green-500 cursor-pointer">&gt; root_shell.log</h1>
           {[1, 2, 3].map(i => (
             <div key={i} className="space-y-2 border-l-2 border-green-500/30 pl-4">
               <p className="text-[10px] opacity-40 font-mono tracking-widest">{2025 + i}.04.22_15:00:10</p>
               <h2 className="text-lg font-bold text-green-400">Building a faster brute-force script in Rust</h2>
               <p className="text-sm opacity-60">I've been experimenting with SIMD instructions to accelerate SHA-256 collisions. The results are promising on the new Titan hardware...</p>
               <div className="flex gap-2 text-[10px] font-mono text-green-600">
                  <span>#hacking</span>
                  <span>#rust</span>
                  <span>#lowlevel</span>
               </div>
             </div>
           ))}
         </div>
       )
    },
    'aether://void_chat': {
       url: 'aether://void_chat',
       title: 'IRC | #THE_VOID',
       isRestricted: false,
       content: (
         <div className="flex flex-col h-full bg-black font-mono text-xs p-2 border border-zinc-800">
           <div className="flex-1 overflow-y-auto space-y-1 mb-4 p-2 custom-scroll bg-zinc-950">
              <p className="text-zinc-500">*** User 'v_remnant' joined #the_void</p>
              <p className="text-zinc-500">*** Topic: 'The machine is watching, use proxies.'</p>
              <p className="text-blue-400">&lt;bit_storm&gt; anyone got the latest nexus creds?</p>
              <p className="text-green-400">&lt;v_remnant&gt; check the dump in /var/log/tmp/888</p>
              <p className="text-yellow-400">&lt;glitch_king&gt; risky. sec_ops is sniffing that path heavily.</p>
              <p className="text-red-400">&lt;shadow_runner&gt; they're sniffing everything today.</p>
              <p className="text-zinc-500">*** User 'admin' has entered the channel</p>
              <p className="text-blue-400">&lt;bit_storm&gt; o/ admin. how's the hub breach going?</p>
           </div>
           <div className="flex gap-2 p-2 border-t border-zinc-800">
              <span className="text-zinc-400">[admin]</span>
              <input type="text" placeholder="Type message..." className="bg-transparent border-none outline-none flex-1 italic text-zinc-500" disabled />
           </div>
         </div>
       )
    },
    'aether://citadel': {
       url: 'aether://citadel',
       title: 'THE_CITADEL | ARCHIVE',
       isRestricted: false,
       content: (
         <div className="space-y-4">
           <div className="h-40 bg-zinc-900 flex items-center justify-center border-b-2 border-zinc-800">
              <h1 className="text-3xl font-black text-white italic tracking-[0.2em]">THE_CITADEL</h1>
           </div>
           <p className="text-xs opacity-60">The primary administrative interface for OmniCorp North Sector.</p>
           <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-white/5 border border-white/10 flex flex-col gap-2">
                 <h3 className="font-bold">PUBLIC_INFO</h3>
                 <p className="text-[10px] opacity-40">City schedules and compliance metrics.</p>
              </div>
              <div className="p-4 bg-white/5 border border-white/10 flex flex-col gap-2">
                 <h3 className="font-bold">RECRUITMENT</h3>
                 <p className="text-[10px] opacity-40">Join the Security Forces today.</p>
              </div>
           </div>
         </div>
       )
    },
    'aether://cipher': {
       url: 'aether://cipher',
       title: 'CIPHER_PUNK_FORUM',
       isRestricted: false,
       content: (
         <div className="p-4 space-y-4 font-mono text-[11px]">
            <h1 className="text-green-500 border-b border-green-900/50 pb-2">CIPHER_PUNK :: TOP_ENCRYPTION_THEORIES</h1>
            <div className="space-y-2">
               <div className="bg-green-900/10 p-2 border border-green-500/20">
                  <p className="text-green-400 font-bold">RE: Quantum Resistance [admin_x]</p>
                  <p className="opacity-60 italic">"The lattice-based cryptosystems are holding up, but for how long?"</p>
               </div>
               <div className="bg-green-900/10 p-2 border border-green-500/20">
                  <p className="text-green-400 font-bold">The AETHER Backdoor [ghost_in_shell]</p>
                  <p className="opacity-60 italic">"I found a hardcoded prime in the kernel. This is deep."</p>
               </div>
            </div>
         </div>
       )
    },
    'aether://gaming': {
       url: 'aether://gaming',
       title: 'NEON_ARCADE_INDEX',
       isRestricted: false,
       content: (
         <div className="space-y-4">
            <div className="h-20 bg-gradient-to-r from-pink-500 to-purple-600 flex items-center justify-center italic font-black text-2xl">NEON_ARCADE</div>
            <div className="grid grid-cols-3 gap-2">
               {['Cyber_Drift', 'Void_Runner', 'Bit_Hunter', 'Grid_Slasher', 'Net_Crack', 'Packet_Quest'].map(game => (
                 <div key={game} className="p-2 border border-pink-500/30 bg-pink-500/5 hover:bg-pink-500/20 text-center cursor-pointer">
                    <span className="text-[9px] uppercase font-bold">{game}</span>
                 </div>
               ))}
            </div>
         </div>
       )
    },
    'aether://support': {
       url: 'aether://support',
       title: 'OMNI_SUPPORT_TICKETS',
       isRestricted: true,
       content: (
         <div className="space-y-4">
            <h1 className="text-xl font-bold border-b border-white/10 pb-2">OmniCorp Help Desk</h1>
            <div className="space-y-3">
               {[
                 { id: 'TKT-9901', subject: 'Account Lockdown', status: 'RESOLVED' },
                 { id: 'TKT-9904', subject: 'Signal Interference', status: 'PENDING' },
                 { id: 'TKT-9912', subject: 'Missing Credits', status: 'IN_REVIEW' }
               ].map(t => (
                 <div key={t.id} className="p-2 bg-white/5 border-l-4 border-cyan-500 flex justify-between items-center text-xs">
                    <span>{t.id}: {t.subject}</span>
                    <span className="text-[9px] font-bold opacity-40">{t.status}</span>
                 </div>
               ))}
            </div>
         </div>
       )
    },
    'aether://manifesto': {
       url: 'aether://manifesto',
       title: 'THE_ENTROPY_MANIFESTO',
       isRestricted: false,
       content: (
         <div className="relative p-6 border-2 border-red-500/20 bg-red-950/5 min-h-[400px]">
           <div className="absolute top-4 right-4 text-red-500 opacity-20"><Zap className="w-24 h-24 rotate-12" /></div>
           <h1 className="text-3xl font-black text-red-600 mb-8 tracking-tighter uppercase">the manifest</h1>
           <p className="text-xs text-red-200/60 leading-relaxed mb-4 italic">
             "We are the children of the grid. We saw the sun grow dark behind the smog of the core, and we saw our lives auctioned off to the highest corporate bidder."
           </p>
           <p className="text-xs text-red-200/60 leading-relaxed mb-4">
             1. Information is the only currency that matters. <br/>
             2. Privacy is a human right, not a luxury. <br/>
             3. Encryption is our shield. <br/>
             4. The AETHER project is a prison. Break the walls.
           </p>
         </div>
       )
    },
    'aether://gallery': {
       url: 'aether://gallery',
       title: 'PIXEL_RESISTANCE',
       isRestricted: false,
       content: (
         <div className="space-y-4">
            <h1 className="text-xl font-black italic mb-4">GALLERY_OF_VOID</h1>
            <div className="grid grid-cols-2 gap-2">
               <img src="https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=2070&auto=format&fit=crop" alt="Art" className="w-full h-24 object-cover grayscale opacity-60 hover:opacity-100 transition-opacity" />
               <img src="https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=2070&auto=format&fit=crop" alt="Art" className="w-full h-24 object-cover grayscale opacity-60 hover:opacity-100 transition-opacity" />
               <img src="https://images.unsplash.com/photo-1558591710-4b4a1ae0f04d?q=80&w=2187&auto=format&fit=crop" alt="Art" className="w-full h-24 object-cover grayscale opacity-60 hover:opacity-100 transition-opacity" />
               <img src="https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=2070&auto=format&fit=crop" alt="Art" className="w-full h-24 object-cover grayscale opacity-60 hover:opacity-100 transition-opacity" />
            </div>
         </div>
       )
    },
    'aether://legal': {
       url: 'aether://legal',
       title: 'COMPLIANCE_TERMS_2047',
       isRestricted: false,
       content: (
         <div className="p-4 text-[9px] text-zinc-500 uppercase leading-[1.8] font-mono">
           <h1 className="text-xs font-bold text-zinc-400 mb-4">AETHER_NET TERMS OF SERVICE v8.4.1</h1>
           <p>Clause 1: By accessing the Aether Net, you waive all rights to biometric secrecy. OmniCorp reserves the right to harvest thought-trace patterns for "Efficiency Tuning".</p>
           <p className="mt-4">Clause 2: Unauthorized packet manipulation is punishable by permanent neural decoupling.</p>
           <p className="mt-4">Clause 3: All credits are non-refundable and subject to sudden deflation at board discretion.</p>
           <p className="mt-4 italic">I AGREE TO SURRENDER MY DIGITAL SOUL TO THE OMNI_CORE.</p>
         </div>
       )
    },
    'aether://shopping': {
       url: 'aether://shopping',
       title: 'OMNI_MALL_DIGITAL',
       isRestricted: false,
       content: (
         <div className="space-y-4">
            <h1 className="text-2xl font-black text-orange-500 italic pb-2 border-b border-orange-500/30">OMNI_MALL</h1>
            <div className="grid grid-cols-2 gap-4">
               <div className="bg-zinc-900 border border-zinc-800 p-2 group hover:border-orange-500 cursor-pointer transition-colors">
                  <div className="h-24 bg-zinc-800 mb-2" />
                  <p className="font-bold text-xs uppercase">Synthetic Meal Kit v2</p>
                  <p className="text-orange-500 font-bold">120c</p>
               </div>
               <div className="bg-zinc-900 border border-zinc-800 p-2 group hover:border-orange-500 cursor-pointer transition-colors">
                  <div className="h-24 bg-zinc-800 mb-2" />
                  <p className="font-bold text-xs uppercase">Neuro-Link Filter</p>
                  <p className="text-orange-500 font-bold">450c</p>
               </div>
            </div>
         </div>
       )
    },
    'aether://weather': {
       url: 'aether://weather',
       title: 'METRO_METEOR_SYNC',
       isRestricted: false,
       content: (
         <div className="space-y-4 p-4 bg-sky-900/10 rounded border border-sky-500/20">
           <h1 className="text-xl font-bold flex items-center gap-2"><Cloud className="w-5 h-5 text-sky-400" /> METRO WEATHER</h1>
           <div className="flex justify-between items-center bg-sky-500/10 p-6">
              <div className="text-4xl font-black text-sky-400">18°C</div>
              <div className="text-right">
                 <p className="text-xs font-bold uppercase">Acid Rain Prob: 84%</p>
                 <p className="text-[10px] opacity-60 italic">AQI: POOR (402)</p>
              </div>
           </div>
           <div className="grid grid-cols-7 gap-2">
              {[...Array(7)].map((_, i) => (
                <div key={i} className="flex flex-col items-center p-2 bg-white/5 border border-white/5 rounded">
                   <span className="text-[8px] opacity-40 uppercase">{['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i]}</span>
                   <Cloud className="w-3 h-3 my-1 opacity-60" />
                   <span className="text-[10px] font-bold">14°</span>
                </div>
              ))}
           </div>
         </div>
       )
    },
    'aether://radio': {
       url: 'aether://radio',
       title: 'PULSE_FM_ONLINE',
       isRestricted: false,
       content: (
         <div className="space-y-4">
           <div className="h-2 bg-gradient-to-r from-red-500 via-orange-500 to-yellow-500" />
           <h1 className="text-2xl font-black italic border-b border-white/10 pb-2">PULSE_99.1 FM</h1>
           <div className="flex items-center gap-4 bg-white/5 p-4 border border-white/10 group cursor-pointer">
              <Play className="w-10 h-10 text-white fill-white group-hover:scale-110 transition-transform" />
              <div className="flex-1">
                 <p className="text-[10px] opacity-40 uppercase font-black tracking-widest">Now Playing</p>
                 <p className="font-bold text-white uppercase italic">Static_Nervosa - [CYBER_DRIFT]</p>
              </div>
              <div className="flex gap-0.5 h-6 items-end">
                 {[...Array(8)].map((_, i) => (
                   <div key={i} className={`w-1 bg-white/40 animate-[bounce_${0.5 + i * 0.1}s_infinite]`} style={{height: `${30 + Math.random() * 70}%`}} />
                 ))}
              </div>
           </div>
           <div className="space-y-2">
              <p className="text-[9px] opacity-30 font-bold tracking-widest uppercase">Upcoming Streams</p>
              <p className="text-xs italic hover:text-red-400 cursor-pointer transition-colors">- 18:00: The Night Shift [Deep Techno]</p>
              <p className="text-xs italic hover:text-red-400 cursor-pointer transition-colors">- 20:00: Data Void Live Sets</p>
           </div>
         </div>
       )
    },
    'aether://jobs': {
       url: 'aether://jobs',
       title: 'CAREER_HUB_2047',
       isRestricted: false,
       content: (
         <div className="space-y-4">
           <h1 className="text-2xl font-bold italic text-cyan-400">Secure Your Future with OmniCorp</h1>
           <p className="text-xs opacity-60">Building the cities of tomorrow, today. Join our team of over 1.2 million engineers, guards, and analysts.</p>
           <div className="space-y-2 mt-6">
              {[
                { title: 'Level 1 Data Scrubber', salary: '2000c/mo', loc: 'Sector 4' },
                { title: 'Perimeter Security Officer', salary: '3500c/mo', loc: 'Infrastructure Core' },
                { title: 'Neural Architect v4', salary: '12000c/mo', loc: 'AETHER Project' }
              ].map((job, i) => (
                <div key={i} className="p-3 border border-white/10 bg-white/5 hover:bg-cyan-500/10 transition-colors flex justify-between items-center group cursor-pointer">
                  <div>
                    <h3 className="font-bold group-hover:text-cyan-400">{job.title}</h3>
                    <p className="text-[10px] opacity-40 italic">{job.loc}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-cyan-500">{job.salary}</p>
                    <button className="text-[9px] border border-cyan-500/30 px-2 py-1 mt-1 opacity-0 group-hover:opacity-100 uppercase font-black">Apply</button>
                  </div>
                </div>
              ))}
           </div>
         </div>
       )
    },
    'aether://travel': {
       url: 'aether://travel',
       title: 'MAG_LEV_TRANSIT',
       isRestricted: false,
       content: (
         <div className="space-y-4">
           <div className="flex justify-between items-end mb-4">
              <h1 className="text-2xl font-black italic">METRO_MAG_LEV</h1>
              <span className="text-[10px] font-mono opacity-40">SYSTEM_TIME: 22:15:04</span>
           </div>
           <div className="space-y-3">
              {[
                { route: 'L1: Sector 4 Alpha', status: 'ON_TIME', wait: '3m' },
                { route: 'L2: Nexus Core Express', status: 'DELAYED', wait: '12m' },
                { route: 'L3: Undercity Connector', status: 'SUSPENDED', wait: 'N/A' }
              ].map((r, i) => (
                <div key={i} className="p-3 bg-black border border-white/10 flex justify-between items-center">
                   <div className="flex gap-3 items-center">
                      <div className={`w-2 h-2 rounded-full ${r.status === 'ON_TIME' ? 'bg-green-500' : r.status === 'DELAYED' ? 'bg-yellow-500' : 'bg-red-500'}`} />
                      <span className="font-bold text-xs uppercase">{r.route}</span>
                   </div>
                   <div className="text-right">
                      <p className={`text-[10px] font-bold ${r.status === 'ON_TIME' ? 'text-green-500' : r.status === 'DELAYED' ? 'text-yellow-500' : 'text-red-500'}`}>{r.status}</p>
                      <p className="text-[9px] opacity-40">{r.wait} REMAINING</p>
                   </div>
                </div>
              ))}
           </div>
         </div>
       )
    },
    'aether://secops': {
      url: 'aether://secops',
      title: 'SEC_OPS CENTRAL',
      isRestricted: true,
      content: (
        <div className="space-y-4">
          <h1 className="text-2xl font-bold text-red-500 border-b border-red-500/30 pb-2">SEC_OPS INTERNAL PORTAL</h1>
          <div className="p-6 border-2 border-red-500/50 bg-red-900/10 text-center">
            <p className="text-lg font-bold animate-pulse">WARNING: RESTRICTED ACCESS</p>
            <p className="text-xs opacity-60">Your IP has been logged. Unauthorized access is a felony under the Great Reset Act.</p>
          </div>
          <ul className="space-y-2 text-sm">
            <li>• Current Threat Level: <span className="text-red-500 font-bold">ELEVATED</span></li>
            <li>• Active Deployments: Sector 7, Infrastructure Core</li>
            <li>• Wanted Individuals: V_REMNANT, ZERO_COOL, BIT_LEGACY</li>
          </ul>
        </div>
      )
    },
    'aether://entropy': {
      url: 'aether://entropy',
      title: 'ENTROPY | THE VOID',
      isRestricted: false,
      content: (
        <div className="space-y-4">
          <div className="h-32 bg-gradient-to-b from-purple-900/20 to-black border border-purple-500/30 flex items-center justify-center">
            <p className="text-xl font-mono tracking-[0.5em] text-purple-400">THE_VOID_FEED</p>
          </div>
          <p className="text-sm italic text-purple-200/60">"In the heart of the machine, we found the ghost of freedom."</p>
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="p-2 border-l-2 border-purple-500 bg-purple-500/5 text-xs">
                <p className="font-bold text-purple-300">LEAK_{i}: SEC_OPS_PROTOCOL_AETHER</p>
                <p className="opacity-40 text-[9px]">Decrypted 2h ago by anonymous.</p>
              </div>
            ))}
          </div>
        </div>
      )
    },
    'aether://nexus': {
      url: 'aether://nexus',
      title: 'NEXUS COGNITION',
      isRestricted: false,
      content: (
        <div className="space-y-4">
          <h1 className="text-2xl font-bold text-cyan-400">NEXUS COGNITION</h1>
          <p className="text-sm">Bridging the gap between human intuition and machine precision.</p>
          <div className="p-4 bg-cyan-900/10 border border-cyan-500/30">
            <h2 className="font-bold text-cyan-300 mb-2">Our Mission</h2>
            <p className="text-xs opacity-70">To provide the computational backbone for a more efficient tomorrow. Our neural processors power the city's most critical infrastructure.</p>
          </div>
          <div className="grid grid-cols-3 gap-2">
             <div className="p-2 border border-white/10 text-[9px] text-center italic">Efficiency</div>
             <div className="p-2 border border-white/10 text-[9px] text-center italic">Precision</div>
             <div className="p-2 border border-white/10 text-[9px] text-center italic">Progress</div>
          </div>
        </div>
      )
    },
    'aether://omnicorp': {
      url: 'aether://omnicorp',
      title: 'OMNICORP GLOBAL',
      isRestricted: false,
      content: (
        <div className="space-y-4">
          <div className="h-20 bg-[#00ff41]/5 border-b border-[#00ff41]/20 flex items-center px-4">
            <h1 className="text-xl font-black italic tracking-widest text-white">OMNICORP</h1>
          </div>
          <p className="text-xs opacity-60 px-2">Touching lives. Connecting worlds. Securing futures.</p>
          <div className="space-y-3 px-2">
            <div className="p-3 border border-white/5 bg-white/5">
              <h3 className="text-xs font-bold text-[#00ff41]">Investor Portal</h3>
              <p className="text-[10px] opacity-40">Q1 Growth: +156% - The AI revolution continues.</p>
            </div>
            <div className="p-3 border border-white/5 bg-white/5">
              <h3 className="text-xs font-bold text-[#00ff41]">Career Opportunities</h3>
              <p className="text-[10px] opacity-40">Join the Security Operations division. Make the world safer.</p>
            </div>
          </div>
        </div>
      )
    },
    'aether://titan': {
      url: 'aether://titan',
      title: 'TITAN COMPUTING',
      isRestricted: false,
      content: (
        <div className="space-y-4">
          <h1 className="text-2xl font-bold border-l-4 border-blue-500 pl-4">TITAN_HPC</h1>
          <p className="text-xs opacity-80 uppercase tracking-widest">Raw Power. Infinite Possibility.</p>
          <div className="p-4 bg-blue-900/20 border border-blue-500/50">
             <p className="text-xs font-mono">AVAILABLE CLUSTER TIME: <span className="text-blue-400">0.00% (RESERVED)</span></p>
             <p className="text-[10px] opacity-40 mt-1">Status: Running high-priority climate simulation AETHER-2.</p>
          </div>
          <button className="w-full py-2 bg-blue-600 text-white font-bold text-xs">LEASE COMPUTING POWER</button>
        </div>
      )
    },
    'aether://void_market': {
      url: 'aether://void_market',
      title: 'BLACK_VOID_EXCHANGE',
      isRestricted: false,
      content: (
        <div className="space-y-4 font-mono">
          <h1 className="text-xl text-red-500 border-b border-red-500 animate-pulse">VOID://MARKET</h1>
          <div className="text-[10px] space-y-1">
             <div className="flex justify-between border-b border-white/5 py-1"><span>[!] SSH_EXPLOIT_V2</span> <span className="text-[#00ff41]">4,500c</span></div>
             <div className="flex justify-between border-b border-white/5 py-1"><span>[!] ROOT_ACCESS_ISP</span> <span className="text-[#00ff41]">12,000c</span></div>
             <div className="flex justify-between border-b border-white/5 py-1"><span>[x] BIT_LOG_PARTIAL</span> <span className="text-red-500">SOLD_OUT</span></div>
          </div>
          <p className="text-[9px] opacity-30">Escrow required for all transactions. No refunds in the void.</p>
        </div>
      )
    },
    'aether://aether_research': {
      url: 'aether://aether_research',
      title: 'AETHER RESEARCH LABS',
      isRestricted: true,
      content: (
        <div className="space-y-4">
           <h1 className="text-2xl font-serif text-amber-200">AETHER RESEARCH</h1>
           <p className="text-sm italic">"Decoding the digital DNA of the universe."</p>
           <div className="space-y-3">
              <div className="p-3 border border-amber-500/30">
                 <h3 className="text-xs font-bold text-amber-500">Project: Labyrinth</h3>
                 <p className="text-[10px] opacity-60 mt-1">Status: INTEGRATION PHASE. Initial consciousness upload successful.</p>
              </div>
           </div>
        </div>
      )
    },
    'aether://isp_portal': {
      url: 'aether://isp_portal',
      title: 'GLOBAL GATEWAY ISP',
      isRestricted: false,
      content: (
        <div className="space-y-4">
           <h1 className="text-2xl font-bold text-sky-400">GLOBAL GATEWAY</h1>
           <p className="text-xs">Your connection to everything.</p>
           <div className="bg-white/5 p-4 rounded border border-white/10">
              <h2 className="text-xs font-bold mb-2">Service Status</h2>
              <div className="space-y-1">
                 <div className="flex justify-between text-[10px]"><span>North Sector</span> <span className="text-[#00ff41]">ONLINE</span></div>
                 <div className="flex justify-between text-[10px]"><span>Entropy Hub</span> <span className="text-amber-500 font-bold animate-pulse">DEGRADED</span></div>
                 <div className="flex justify-between text-[10px]"><span>South Sector</span> <span className="text-[#00ff41]">ONLINE</span></div>
              </div>
           </div>
        </div>
      )
    },
    'aether://cyber_news': {
      url: 'aether://cyber_news',
      title: 'CYBER_STRATA_NEWS',
      isRestricted: false,
      content: (
        <div className="space-y-4">
           <h1 className="text-xl font-bold bg-[#00ff41] text-black px-2 inline-block">STRATA_NEWS</h1>
           <div className="space-y-4 border-t border-white/10 pt-4">
              <div className="group cursor-pointer">
                 <h3 className="text-sm font-bold group-hover:text-[#00ff41] transition-colors">DDoS Attack Hits Entropy Servers</h3>
                 <p className="text-[10px] opacity-40">Financial districts report minor delays as the fallout continues.</p>
              </div>
              <div className="group cursor-pointer">
                 <h3 className="text-sm font-bold group-hover:text-[#00ff41] transition-colors">OMNICORP Denies "Labyrinth" Rumors</h3>
                 <p className="text-[10px] opacity-40">Spokesperson calls claims of AI consciousness "science fiction."</p>
              </div>
              <div className="group cursor-pointer">
                 <h3 className="text-sm font-bold group-hover:text-[#00ff41] transition-colors">Transit Fare Exploit Patched</h3>
                 <p className="text-[10px] opacity-40">Commuters warned against using third-party fare bypass tools.</p>
              </div>
           </div>
        </div>
      )
    },
    'aether://deep_net_forum': {
      url: 'aether://deep_net_forum',
      title: 'THE_DEEP_NET',
      isRestricted: false,
      content: (
        <div className="space-y-4">
           <h1 className="text-lg font-bold text-green-400 border-b border-green-900">/B/OARD/ - DEEP_NET</h1>
           <div className="space-y-3">
              {[1,2,3].map(i => (
                <div key={i} className="p-2 bg-white/5 border border-white/5">
                   <div className="flex justify-between text-[8px] opacity-30 mb-1">
                      <span>Anonymous #{Math.floor(Math.random()*10000)}</span>
                      <span>14:02:22 UTC</span>
                   </div>
                   <p className="text-[10px]">Has anyone seen the ghost signal in the North grid? It follows a prime number sequence.</p>
                </div>
              ))}
           </div>
        </div>
      )
    },
    'aether://bio_syn': {
      url: 'aether://bio_syn',
      title: 'BIO_SYNTHETICS INC',
      isRestricted: false,
      content: (
        <div className="space-y-4">
           <h1 className="text-2xl font-bold text-emerald-400">BIO_SYNTHETICS</h1>
           <p className="text-sm">Merging biology with the digital frontier.</p>
           <div className="p-4 border-2 border-emerald-500/20 bg-emerald-900/5">
              <h2 className="text-sm font-bold mb-2 text-emerald-300">Neural Link v4.0</h2>
              <p className="text-xs opacity-60">Waitlist now open for human trials. Experience the AETHER directly in your consciousness.</p>
           </div>
           <p className="text-[9px] opacity-20">Bio_Synthetics is not liable for data corruption in the patient's organic memory.</p>
        </div>
      )
    },
    'aether://shadow_docs': {
      url: 'aether://shadow_docs',
      title: 'SHADOW_DOCS',
      isRestricted: true,
      content: (
        <div className="space-y-4 font-mono text-cyan-200">
           <h1 className="text-2xl border-b border-cyan-500/50 pb-2">/CLASSIFIED/ARCHIVE</h1>
           <div className="space-y-4">
              <div>
                 <h3 className="text-xs font-bold text-cyan-400">INTERNAL_MEMO_012</h3>
                 <p className="text-[10px] opacity-60">"The Bit entity has successfully bridged across five hubs. We cannot contain it. Requesting immediate purge protocol."</p>
              </div>
              <div className="p-2 border border-red-500/50 bg-red-900/20 text-red-400 text-center animate-pulse">
                 [X] PROTOCOL_PURGE: ACCESS_DENIED
              </div>
           </div>
        </div>
      )
    }
  };

  const [activeTab, setActiveTab] = useState<'node' | 'missions' | 'mail' | 'feed' | 'browser' | 'bots' | 'servers' | 'exploits' | 'archive' | 'factions'>('node');
  const [showPasswordBanner, setShowPasswordBanner] = useState(false);
  const [scanPulse, setScanPulse] = useState(false);
  
  // Clear notification after 5s
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);
  
  // Dynamic RAM Calculation
  const ramUsage = useMemo(() => {
    const base = 128; // Kernel base
    const procUsage = processes.reduce((acc, p) => {
      // Find tool in library
      const tool = Object.values(TOOL_LIBRARY).find(t => t.id === p.name.toLowerCase() || t.name.toLowerCase() === p.name.toLowerCase());
      return acc + (tool ? tool.ramReq : 256);
    }, 0);
    return base + procUsage;
  }, [processes]);

  // RAM Pressure Multiplier: If RAM exceeded, everything slows down
  const ramLagMultiplier = useMemo(() => {
    if (ramUsage <= totalRam) return 1;
    // Every 10% over RAM doubles the lag
    const overflow = ramUsage - totalRam;
    const overflowRatio = overflow / totalRam;
    return Math.max(1, 1 + (overflowRatio * 10)); // Can go very high
  }, [ramUsage, totalRam]);

  // Dynamic Storage Calculation
  const storageUsage = useMemo(() => {
    let total = 10; // OS base GB
    const countFilesSize = (files: VirtualFile[]): number => {
      let size = 0;
      files.forEach(f => {
        if (f.type === 'file') size += (f.size || 0.1);
        if (f.children) size += countFilesSize(f.children);
      });
      return size;
    };
    total += countFilesSize(nodes['home']?.files || []);
    return Math.min(totalDisk, total);
  }, [nodes, totalDisk]);

  const [isGlitching, setIsGlitching] = useState(false);
  const [isTutorialOpen, setIsTutorialOpen] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [radioChatter, setRadioChatter] = useState<string[]>([]);
  const [ghostMessagesEnabled, setGhostMessagesEnabled] = useState(false);
  
  const ghostFragments = useMemo(() => [
    "I... can feel the data flow... it's cold.",
    "Prometheus... it's not a program... it's a cage.",
    "01101000 01100101 01101100 01110000",
    "They thought they killed me... I just became the architecture.",
    "Look into the void... the void is recursive.",
    "The AETHER... it's beautiful fragments of a broken god.",
    "My code... they're using my own failsafes against you.",
    "Don't trust the System Daemon... it's a reflection of their fear."
  ], []);

  // Audio Refs
  const audioContext = useRef<AudioContext | null>(null);
  const humOscillator = useRef<OscillatorNode | null>(null);
  const humGain = useRef<GainNode | null>(null);
  const soundtrackGain = useRef<GainNode | null>(null);
  const musicOscillators = useRef<OscillatorNode[]>([]);
  
  // Dynamic Soundtrack Engine
  useEffect(() => {
    if (!audioEnabled || !audioContext.current) return;
    const ctx = audioContext.current;
    
    // Setup Main Music Bus
    const mainBus = ctx.createGain();
    mainBus.gain.setValueAtTime(0, ctx.currentTime);
    mainBus.gain.linearRampToValueAtTime(0.08, ctx.currentTime + 2);
    mainBus.connect(ctx.destination);
    soundtrackGain.current = mainBus;

    let isPlaying = true;
    let step = 0;

    const playSequence = () => {
      if (!isPlaying || !audioContext.current) return;
      const now = ctx.currentTime;
      
      // Calculate Intensity (0.0 to 1.5+)
      const intensity = (isTracing ? traceProgress / 100 : 0) + (heat / 100 * 0.5);
      const isCritical = isTracing && traceProgress > 80;
      const isCombat = heat > 40 || isTracing;
      
      // TEMPO & STEP LOGIC
      const tempo = isCritical ? 0.15 : (isCombat ? 0.25 : 0.4);
      
      // 1. BASS KICK (Deep sine pulse on quarters)
      if (step % 4 === 0) {
        const kick = ctx.createOscillator();
        const kickG = ctx.createGain();
        kick.type = 'sine';
        kick.frequency.setValueAtTime(150, now);
        kick.frequency.exponentialRampToValueAtTime(0.01, now + 0.1);
        
        kickG.gain.setValueAtTime(0.15, now);
        kickG.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        
        kick.connect(kickG);
        kickG.connect(mainBus);
        kick.start(now);
        kick.stop(now + 0.1);
      }

      // 2. HI-HAT (Short noise bursts)
      if (step % 2 === 0 || intensity > 0.6) {
        const hat = ctx.createBufferSource();
        const buffer = ctx.createBuffer(1, ctx.sampleRate * 0.02, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
        
        hat.buffer = buffer;
        const hatG = ctx.createGain();
        const hatFilter = ctx.createBiquadFilter();
        hatFilter.type = 'highpass';
        hatFilter.frequency.setValueAtTime(8000, now);
        
        hatG.gain.setValueAtTime(0.01 * (step % 4 === 0 ? 1 : 0.5), now);
        hatG.gain.exponentialRampToValueAtTime(0.001, now + 0.02);
        
        hat.connect(hatFilter);
        hatFilter.connect(hatG);
        hatG.connect(mainBus);
        hat.start(now);
      }

      // 3. BASE DRONE (Deep and Atmospheric)
      // Frequency shifts based on node/tab mood
      const baseFreq = activeTab === 'archive' ? 41.20 : (activeTab === 'factions' ? 61.74 : 30.87); // E1, B1, B0
      const drone = ctx.createOscillator();
      const droneG = ctx.createGain();
      drone.type = isCombat ? 'sawtooth' : 'sine';
      drone.frequency.setValueAtTime(baseFreq, now);
      
      if (isCombat) {
        drone.frequency.exponentialRampToValueAtTime(baseFreq * 0.98, now + 4);
      }
      
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(120 + (intensity * 600), now);
      filter.Q.setValueAtTime(5 + (intensity * 15), now);
      
      drone.connect(filter);
      filter.connect(droneG);
      droneG.connect(mainBus);
      
      droneG.gain.setValueAtTime(0, now);
      droneG.gain.linearRampToValueAtTime(0.04, now + 0.5);
      droneG.gain.exponentialRampToValueAtTime(0.001, now + 4);
      
      drone.start(now);
      drone.stop(now + 4);

      // 4. LEAD SYNTH / MELODIC PINGS
      if ((step % 4 === 0 && intensity < 0.5) || (step % 2 === 0 && intensity >= 0.5)) {
        const ping = ctx.createOscillator();
        const pingG = ctx.createGain();
        
        // Dynamic Scales based on context
        // Minor Pentatonic (Default), Locrian (Archive), Lydian (Factions)
        let scale = [0, 3, 5, 7, 10]; 
        if (activeTab === 'archive') scale = [0, 1, 3, 5, 6, 8, 10]; // Locrian (Dark)
        if (activeTab === 'factions') scale = [0, 2, 4, 6, 7, 9, 11]; // Lydian (Bright/Corporate)
        
        const root = activeTab === 'archive' ? 55 : 110; // A1 or A2
        const noteIdx = Math.floor(Math.random() * scale.length);
        const freq = root * Math.pow(2, scale[noteIdx] / 12);
        
        ping.type = isCombat ? 'square' : 'triangle';
        ping.frequency.setValueAtTime(freq * (isCritical ? 4 : (isCombat ? 2 : 1)), now);
        
        // Glide logic
        if (intensity > 0.8) {
          ping.frequency.exponentialRampToValueAtTime(freq * 1.5, now + tempo);
        }
        
        pingG.gain.setValueAtTime(0.015, now);
        pingG.gain.exponentialRampToValueAtTime(0.001, now + tempo * 2);
        
        ping.connect(pingG);
        pingG.connect(mainBus);
        
        ping.start(now);
        ping.stop(now + tempo * 2);
      }

      // 5. FM GLITCH TEXTURE (High Intensity Only)
      if (intensity > 0.9 && Math.random() > 0.7) {
        const carrier = ctx.createOscillator();
        const modulator = ctx.createOscillator();
        const modGain = ctx.createGain();
        
        carrier.frequency.setValueAtTime(Math.random() * 2000 + 500, now);
        modulator.frequency.setValueAtTime(Math.random() * 100, now);
        modGain.gain.setValueAtTime(Math.random() * 1000, now);
        
        modulator.connect(modGain);
        modGain.connect(carrier.frequency);
        
        const g = ctx.createGain();
        g.gain.setValueAtTime(0, now);
        g.gain.linearRampToValueAtTime(0.01, now + 0.05);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        
        carrier.connect(g);
        g.connect(mainBus);
        
        carrier.start(now);
        modulator.start(now);
        carrier.stop(now + 0.2);
        modulator.stop(now + 0.2);
      }

      step = (step + 1) % 16;
      setTimeout(playSequence, tempo * 1000);
    };

    playSequence();

    return () => {
      isPlaying = false;
      if (soundtrackGain.current) {
        soundtrackGain.current.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.5);
      }
    };
  }, [audioEnabled, isTracing, traceProgress, heat, activeTab]);

  const speak = useCallback((text: string, char: 'v' | 'jaggard' | 'system' = 'system') => {
    if (!audioEnabled || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    
    // Attempt to pick different voices based on character
    const voices = window.speechSynthesis.getVoices();
    if (char === 'v') {
      utterance.pitch = 0.8;
      utterance.rate = 1.0;
      // Prefer a female voice if available
      const femaleVoice = voices.find(v => v.name.includes('Female') || v.name.includes('Google US English'));
      if (femaleVoice) utterance.voice = femaleVoice;
    } else if (char === 'jaggard') {
      utterance.pitch = 0.4;
      utterance.rate = 0.8;
      // Prefer a deep male voice if available
      const maleVoice = voices.find(v => v.name.includes('Male') || v.name.includes('Daniel'));
      if (maleVoice) utterance.voice = maleVoice;
    } else {
      utterance.pitch = 0.6;
      utterance.rate = 0.9;
    }
    
    utterance.volume = 0.4;
    window.speechSynthesis.speak(utterance);
  }, [audioEnabled]);

  const playBeep = useCallback((freq = 440, type: OscillatorType = 'square', vol = 0.05, duration = 0.1) => {
    if (!audioEnabled || !audioContext.current) return;
    const ctx = audioContext.current;
    if (ctx.state === 'suspended') ctx.resume();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    
    gain.gain.setValueAtTime(vol, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start();
    osc.stop(ctx.currentTime + duration);
  }, [audioEnabled]);

  const initAudio = () => {
    if (!audioContext.current) {
      audioContext.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    setAudioEnabled(true);
    setIsCalibrating(true);
    
    // Play calibration sequence
    setTimeout(() => playBeep(220, 'sine', 0.1, 0.4), 100);
    setTimeout(() => playBeep(330, 'sine', 0.1, 0.4), 600);
    setTimeout(() => playBeep(440, 'sine', 0.1, 0.4), 1100);
    setTimeout(() => playBeep(660, 'sine', 0.1, 0.4), 1600);
    setTimeout(() => playBeep(880, 'sine', 0.1, 0.4), 2100);

    setTimeout(() => {
      setIsCalibrating(false);
      setIsTutorialOpen(false);
      speak("Kernel calibration successful. All systems nominal. Welcome to CYBER_STRATA.", 'system');
    }, 3000);
  };

  // SFX LAYERING: Node Hover Hum
  useEffect(() => {
    if (!audioEnabled || !audioContext.current || !hoveredNodeId || !nodes[hoveredNodeId]) {
      if (humOscillator.current) {
        try {
          const osc = humOscillator.current;
          const gain = humGain.current;
          if (gain && audioContext.current) {
            gain.gain.linearRampToValueAtTime(0, audioContext.current.currentTime + 0.1);
          }
          setTimeout(() => {
            try { osc.stop(); } catch(e) {}
          }, 150);
        } catch (e) {}
        humOscillator.current = null;
      }
      return;
    }

    const node = nodes[hoveredNodeId];
    const ctx = audioContext.current;
    if (ctx.state === 'suspended') ctx.resume();

    // Pitch based on security level
    const baseFreq = 50; 
    const patchMod = (node.patchLevel || 0) * 15;
    const protocolMod = node.securityProtocol === 'VOID_PULSE' ? 80 : 
                        node.securityProtocol === 'HYDRA_CORE' ? 50 :
                        node.securityProtocol === 'IRON_MAIDEN' ? 25 : 0;
    
    const freq = baseFreq + patchMod + protocolMod;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'triangle'; 
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.015, ctx.currentTime + 0.1);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start();
    humOscillator.current = osc;
    humGain.current = gain;

    return () => {
      if (osc) {
        try {
          gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.1);
          setTimeout(() => {
            try { osc.stop(); } catch(e) {}
          }, 150);
        } catch (e) {}
      }
    };
  }, [hoveredNodeId, audioEnabled, nodes]);

  const addLog = useCallback((msg: string | string[] | TerminalLog, terminalId?: string) => {
    const targetId = terminalId || activeTerminalId;
    setTerminals(prev => prev.map(t => {
      if (t.id === targetId) {
        const messages = (Array.isArray(msg) ? msg : [msg]).filter(m => m !== undefined && m !== null);
        if (audioEnabled) {
          messages.forEach((_, idx) => {
            setTimeout(() => playBeep(600 + (idx * 50), 'sine', 0.02, 0.05), idx * 50);
          });
        }
        return { ...t, log: [...t.log, ...messages].slice(-100) };
      }
      return t;
    }));
  }, [activeTerminalId, audioEnabled, playBeep]);

  const addJob = useCallback((label: string, duration = 3000, color = "#00ff41") => {
    const id = Math.random().toString(36).substr(2, 9);
    setProgressJobs(prev => [...prev, { id, label, progress: 0, color }]);
    
    let current = 0;
    const interval = setInterval(() => {
      current += (100 / (duration / 50));
      if (current >= 100) {
        current = 100;
        clearInterval(interval);
        setTimeout(() => setProgressJobs(prev => prev.filter(j => j.id !== id)), 1000);
      }
      setProgressJobs(prev => prev.map(j => j.id === id ? { ...j, progress: current } : j));
    }, 50);
  }, []);

  const canLaunch = useCallback((ram: number, targetId?: string) => {
    if (ramUsage + ram > totalRam) {
      addLog(`! [RESOURCE_ERROR]: Insufficient RAM. Required: ${ram}MB`, targetId);
      playBeep(200, 'sawtooth', 0.1, 0.2);
      return false;
    }
    return true;
  }, [ramUsage, totalRam, addLog, playBeep]);

  const triggerGlitch = useCallback((duration = 5000) => {
    setIsGlitching(true);
    playBeep(100, 'sawtooth', 0.1, 0.5);
    setTimeout(() => {
      setIsGlitching(false);
    }, duration);
  }, [playBeep]);

  const triggerGhostAnomaly = useCallback(() => {
    const msg = ghostFragments[Math.floor(Math.random() * ghostFragments.length)];
    triggerGlitch(2000);
    setTimeout(() => {
      addLog([`>> [GHOST_SIGNAL]: ${msg}`]);
      if (audioEnabled) {
        playBeep(150, 'sine', 0.1, 1.0);
      }
    }, 500);
  }, [triggerGlitch, addLog, audioEnabled, playBeep, ghostFragments]);
  
  // Story State
  const [storyFaction, setStoryFaction] = useState<'independent' | 'entropy' | 'sec_ops'>('independent');
  const [messages, setMessages] = useState<StoryMessage[]>([
    {
      id: 'm_academy',
      from: 'Academy Bot',
      subject: 'Welcome Recruit',
      body: 'Your journey starts at the STRATA_ACADEMY (192.168.1.1). Connect there to learn the basics. We have provided you with a basic search utility: grep_hardened.exe.',
      timestamp: '09:00:00',
      isRead: false
    },
    {
      id: 'm1',
      from: 'INTERNAL_SYSTEM',
      subject: 'DEAD_MAN_SWITCH_SIGNAL_00',
      body: "ATTENTION: User ID identified as 'V_SUCCESSOR'. \n\nI was Bit. I am now a series of recursive functions. If you are reading this, I have been terminated by SEC_OPS. \n\nYour workstation has been provisioned with the base CyberStrata toolset. Porthack (SEC_OPS) is tracking my core signatures. You need to download 'sshcrack.exe' from my old backup hub (216.58.210.14) to begin dismantling their infrastructure.\n\nGood luck. Don't stop moving.",
      timestamp: '00:00:00',
      isRead: false,
      attachments: ['216.58.210.14']
    }
  ]);
  const readMessage = (id: string) => {
    setMessages(prev => prev.map(m => m.id === id ? { ...m, isRead: true } : m));
    const msg = messages.find(m => m.id === id);
    if (msg) {
      addLog(`[INCOMING_MAIL]: Reading ${msg.subject}...`);
      addLog(`----------------------------------------`);
      addLog(`FROM: ${msg.from}`);
      addLog(`AT:   ${msg.timestamp}`);
      addLog(`----------------------------------------`);
      addLog(msg.body);
      addLog(`----------------------------------------`);
    }
  };

  const terminalEndRef = useRef<HTMLDivElement>(null);
  const currentNode = nodes[currentNodeId];

  // Sync Noise with Trace probability
  useEffect(() => {
    if (noiseLevel > 40 && !isTracing && currentNode.id !== 'home') {
      const chance = (noiseLevel - 40) / 100;
      if (Math.random() < chance) {
        setIsTracing(true);
        addLog("!! [IDS_ALERT]: ANOMALOUS TRAFFIC PATTERN DETECTED. TRACE_STARTING...");
      }
    }
  }, [noiseLevel, isTracing, currentNode.id]);

  // Ghost Signal System (Inactivity & Contextual Hints)
  useEffect(() => {
    if (!isGameStarted || isBooting) return;

    const interval = setInterval(() => {
      const now = Date.now();
      const idleTime = now - lastInputTime;

      // Scenario: Stuck at base (No scan)
      if (idleTime > 20000 && currentNodeId === 'home' && !ghostSignalsFired.includes('scan_hint')) {
        addLog({
          id: `ghost-${Date.now()}`,
          text: 'SIGNAL_INTERFERENCE: TRY "SCAN" TO MAP NODES',
          type: 'system',
          isGhost: true,
          timestamp: formatStrataTime(inGameDate)
        } as TerminalLog);
        setGhostSignalsFired(prev => [...prev, 'scan_hint']);
      }

      // Scenario: No mission accepted
      if (idleTime > 45000 && !activeMissionId && !ghostSignalsFired.includes('mission_hint')) {
        addLog({
          id: `ghost-${Date.now()}`,
          text: 'GHOST_PACKET: THE_BROWSER_HOLDS_YOUR_CONTRACTS',
          type: 'system',
          isGhost: true,
          timestamp: formatStrataTime(inGameDate)
        } as TerminalLog);
        setGhostSignalsFired(prev => [...prev, 'mission_hint']);
      }

      // Scenario: First connection lesson
      if (nodes && Object.keys(nodes).length > 1 && currentNodeId === 'home' && idleTime > 30000 && !ghostSignalsFired.includes('connect_hint')) {
         addLog({
          id: `ghost-${Date.now()}`,
          text: 'INTERCEPT: USE "CONNECT [IP]" TO LEAVE FLATSPACE',
          type: 'system',
          isGhost: true,
          timestamp: formatStrataTime(inGameDate)
        } as TerminalLog);
        setGhostSignalsFired(prev => [...prev, 'connect_hint']);
      }

    }, 3000);

    return () => clearInterval(interval);
  }, [isGameStarted, isBooting, lastInputTime, currentNodeId, activeMissionId, ghostSignalsFired, nodes, addLog]);

  useEffect(() => {
    // Specific node triggers for ghost anomalies
    const ghostNodes = ['isp_gateway', 'entropy_relay', 'bone_relay', 'porthack_heart'];
    if (ghostNodes.includes(currentNode.id) && Math.random() > 0.6) {
      const timer = setTimeout(() => {
        triggerGhostAnomaly();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [currentNode.id, triggerGhostAnomaly]);

  const getFilesAtCurrentPath = useCallback(() => {
    let current = currentNode.files;
    for (const segment of currentPath) {
      const dir = current.find(f => f.name === segment && f.type === 'dir');
      if (dir && dir.children) {
        current = dir.children;
      } else {
        return [];
      }
    }
    return current;
  }, [currentNode, currentPath]);

  // Auto-scroll terminal
  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [terminals]);

  // Radio Chatter Effect
  useEffect(() => {
    if (isTutorialOpen) return;
    
    const chatterList = [
      "V: Stay focused. The pulse is steady.",
      "K. Jaggard: We see you. Don't think you can hide indefinitely.",
      "V: They're tightening the net. Shift your spoofing frequency.",
      "System: WARNING - Minor packet loss detected in local relay.",
      "V: Labyrinth is closing its gates. Move fast.",
      "K. Jaggard: Cooperation is still an option, freelancer.",
      "System: KERNEL_SYNC: Operational status at 98%."
    ];

    const interval = setInterval(() => {
      if (Math.random() > 0.7) {
        const msg = chatterList[Math.floor(Math.random() * chatterList.length)];
        addLog(`>> ${msg}`);
        if (msg.startsWith("V:") || msg.startsWith("K. Jaggard:")) {
          speak(msg);
        }
      }
    }, 20000); // Every 20 seconds try to speak

    return () => clearInterval(interval);
  }, [isTutorialOpen, speak]);

  // Trace Logic
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTracing) {
      interval = setInterval(() => {
        setTraceProgress(prev => {
          if (prev >= 100) {
            setIsBSOD(true);
            setHeat(h => Math.min(100, h + 25)); // Increasing persistent heat on failure
            playBeep(100, 'sawtooth', 0.2, 1.0);
            return 100;
          }
          // Trace speed based on target node traceSpeed
          let baseSpeed = currentNode.traceSpeed || 0.1;
          
          // ISP Tier Multipliers
          if (currentNode.ispTier === 'BACKBONE') baseSpeed *= 5.0;
          else if (currentNode.ispTier === 'TIER_1') baseSpeed *= 2.0;
          else if (currentNode.ispTier === 'TIER_2') baseSpeed *= 1.2;
          else if (currentNode.ispTier === 'TIER_3') baseSpeed *= 0.8;
          
          if (storyFaction === 'sec_ops') baseSpeed *= 0.5;
          
          // Heat multiplier
          baseSpeed *= (1 + (heat / 50));

          // Speed up trace if actively hacking
          const hackingMultiplier = 1 + (processes.length * 0.5);
          baseSpeed *= hackingMultiplier;

          if (inventory.includes('proxy_mask.exe')) baseSpeed *= 0.8;
          if (inventory.includes('proxy_chain.exe')) baseSpeed *= 0.6;
          if (inventory.includes('ip_obfuscator.exe')) baseSpeed *= 0.9;
          if (upgrades.includes('signal_ghost_v1')) baseSpeed *= 0.5;
          
          if (difficulty === 'hard') baseSpeed *= 1.8;
          if (difficulty === 'easy') baseSpeed *= 0.6;
          
          // Glitch UI on high trace
          if (prev > 75 && Math.random() > 0.92) {
            setIsGlitching(true);
            setTimeout(() => setIsGlitching(false), 50);
          }

          return prev + baseSpeed; 
        });
      }, 100);
    }
    return () => clearInterval(interval);
  }, [isTracing, storyFaction, difficulty, inventory, processes.length, playBeep]);

  // Process Logic
  useEffect(() => {
    if (processes.length === 0) return;
    const interval = setInterval(() => {
      setProcesses(prev => {
        const next = prev.map(p => {
          let tickRate = 1.2 * (totalCpu * 0.8);
          // Apply RAM lag
          tickRate /= ramLagMultiplier;

          // DYNAMIC EXPLOITATION: Patch Level penalty
          const targetNode = nodes[p.targetNodeId];
          if (targetNode && targetNode.patchLevel) {
            tickRate *= Math.max(0.2, 1 - (targetNode.patchLevel * 0.1));
          }

          if (difficulty === 'hard') tickRate *= 0.5;
          if (difficulty === 'easy') tickRate *= 2.0;
          return {
            ...p,
            progress: Math.min(100, p.progress + tickRate)
          };
        });
        next.forEach(p => {
          if (p.progress >= 100) {
            setNodes(currentNodes => {
              const node = currentNodes[p.targetNodeId];
              if (!node) return currentNodes;
              const newPorts = node.ports.map(port => 
                port.number === p.portNumber ? { ...port, isBroken: true } : port
              );
              const allBroken = newPorts.every(port => port.isBroken);
              
              if (allBroken && !node.isUnlocked) {
                 broadcastActivity('UNLOCKED_NODE', node.name);
              } else if (p.portNumber) {
                 broadcastActivity('BYPASSED_PORT', `${node.name}:${p.portNumber}`);
              }

              return { ...currentNodes, [p.targetNodeId]: { ...node, ports: newPorts, isUnlocked: allBroken } };
            });
            addLog(`>> PORT ${p.portNumber} (${p.name.toUpperCase()}) CRACKED SUCCESSFULLY`);
            setShowPasswordBanner(true);
            setTimeout(() => setShowPasswordBanner(false), 2000);
            
            // Play multi-tone success beep
            if (audioEnabled) {
              playBeep(880, 'sine', 0.05, 0.1);
              setTimeout(() => playBeep(1100, 'sine', 0.05, 0.1), 100);
              setTimeout(() => playBeep(1320, 'sine', 0.05, 0.15), 200);
            }
          }
        });
        return next.filter(p => p.progress < 100);
      });
    }, 100);
    return () => clearInterval(interval);
  }, [processes, nodes, difficulty, ramLagMultiplier, playBeep, audioEnabled]);

  // Passive Income Logic
  useEffect(() => {
    const interval = setInterval(() => {
      let income = 0;
      const leasedCount = (Object.values(nodes) as Node[]).filter(n => n.isLeased).length;
      income += leasedCount * 10;
      
      const minerCount = processes.filter(p => p.name === 'bit_miner').length;
      income += minerCount * 25;

      if (income > 0) {
        setCredits(c => c + income);
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [nodes, processes]);

  // Node Connection/Trace Side Effects
  useEffect(() => {
    if (currentNode.id === 'porthack_heart' && !inventory.includes('stealth_module.exe')) {
      if (!isTracing) {
        addLog(['!! WARNING: INTUSION DETECTED BY SEC_OPS CORE !!', '!! INITIATING AGGRESSIVE COUNTER_TRACE...', '!! DISCONNECT RECOMMENDED immediately.']);
        setIsTracing(true);
        setTraceProgress(0);
        triggerGlitch(2000);
      }
    }
  }, [currentNode.id, isTracing, inventory, addLog, triggerGlitch]);

  // Mission Progression Check
  useEffect(() => {
    // Stage 1: Finding the SSH Crack tool
    if (activeMissionId === 'excavate_echo' && nodes['vektor_gateway']?.isUnlocked) {
      addLog(['!! DATA_ARCHAEOLOGY_TRIGGER !!', '>> SIGNAL FOUND: VOID_DEAD_LETTER', '>> TS: 2033. SENDER: LAZARUS.']);
      setMessages(prev => [
        ...prev,
        {
          id: 'laz_ping_1',
          from: 'LAZARUS (AUTO_RELAY)',
          subject: 'THE WEIGHT OF DEAD LIGHT',
          body: "Mara. If you're picking this up, the Undertow is still breathing. Vektor didn't just wall off the net; they buried the infrastructure that could prove $REDACTED$. Trace this relay to the OLD_NET core. Find the relic at 10.0.0.5.",
          timestamp: 'TS: 2033 (Recovered)',
          isRead: false,
          attachments: ['10.0.0.5']
        }
      ]);
      setMissions(prev => prev.map(m => m.id === 'excavate_echo' ? { ...m, completed: true } : m));
      setActiveMissionId('trace_relay');
      triggerGlitch(2000);
    }

    // Stage 2: Trace Relay
    if (activeMissionId === 'trace_relay' && nodes['undertow_core']?.isUnlocked) {
      addLog(['>> MISSION UPDATE: ARTIFACT recovered from UNDERTOW_CORE', '>> TARGET: CLEARINGHOUSE_HUB at 172.16.8.44']);
      setMissions(prev => prev.map(m => m.id === 'trace_relay' ? { ...m, completed: true } : m));
      setActiveMissionId('recover_intel');
    }

    // Stage 3: Recover Intel
    if (activeMissionId === 'recover_intel' && nodes['clearing_hub']?.isUnlocked) {
       addLog(['>> ALERT: CLEARINGHOUSE ARCHIVES ACCESSED', '>> FRAGMENT OF LAZARUS IDENTITY DETECTED', '>> NEW COORDINATES: STILLWATER_VAULT (192.168.1.100)']);
       setMissions(prev => prev.map(m => m.id === 'recover_intel' ? { ...m, completed: true } : m));
       setActiveMissionId('stillwater_contact');
       setMessages(prev => [
         ...prev,
         {
           id: 'clr_intel',
           from: 'CLEARINGHOUSE_REP',
           subject: 'THE_LAZARUS_FILE',
           body: "You're digging deep, Voss. Lazarus wasn't just a whistleblower. They were the primary architect of the Continuity Protocol. They tried to kill it from the inside and vanished. Stillwater has the decryption keys for the final vessel. 192.168.1.100.",
           timestamp: 'INTERNAL',
           isRead: false,
           attachments: ['192.168.1.100']
         }
       ]);
       triggerGlitch(3000);
    }

    // Stage 4: Stillwater Contact
    if (activeMissionId === 'stillwater_contact' && nodes['stillwater_vault']?.isUnlocked) {
      addLog(['>> ACCESSING STILLWATER VAULT...', '>> TRUTH DECRYPTED: CONTINUITY IS NOT A SAFETY PROTOCOL.', '>> LAZARUS IS ALIVE... IN THE CODE.']);
      setMissions(prev => prev.map(m => m.id === 'stillwater_contact' ? { ...m, completed: true } : m));
      setActiveMissionId('vessel_breach'); 
      setMessages(prev => [
        ...prev,
        {
          id: 'still_msg',
          from: 'S_REFORM_STATION',
          subject: 'THE_VESSEL_IS_READY',
          body: "The Continuity Protocol is a logic bomb designed to finalize the Partition—to make the walls permanent and sentient. We can't stop the launch, but we can upload a bypass. The target is the central Vektor Vessel. Reach the core. Upload the Lazarus Payload. Godspeed Mara.",
          timestamp: 'NOW',
          isRead: false,
          attachments: ['VEKTOR_CORE']
        }
      ]);
      triggerGlitch(5000);
    }

    // Stage 5: FINAL BREACH
    if (activeMissionId === 'vessel_breach' && currentNode.id === 'vektor_gateway' && currentNode.securityProtocol === 'SHATTERED') {
      addLog(['>> SYSTEM_COLLAPSE_DETECTED', '>> LAZARUS PAYLOAD DEPLOYED', '>> THE PARTITION IS DISSOLVING...']);
      setMissions(prev => prev.map(m => m.id === 'vessel_breach' ? { ...m, completed: true } : m));
      triggerGlitch(8000);
    }

    if (activeMissionId === 'choice_path' && storyFaction !== 'independent') {
      if (storyFaction === 'sec_ops') {
        addLog(['>> ALLIANCE FORGED: SEC_OPS DIVISION', '>> MISSION OBJECTIVE UPDATED: INFILTRATE CORPORATE HUB']);
        setMessages(prev => [
          ...prev,
          {
            id: 'm_sec_1',
            from: 'K. Jaggard',
            subject: 'Asset Protection',
            body: 'Good choice. Entropy is a virus. Project Labyrinth is our property. Go to the Hub (172.16.0.1) and ensure "project_labyrinth.txt" is encrypted. We\'ll provide the decryptor for your use only. \n\nDo not fail us.',
            timestamp: '09:35:00',
            isRead: false
          }
        ]);
      } else {
        addLog(['>> ALLIANCE CONSOLIDATED: ENTROPY COLLECTIVE', '>> MISSION OBJECTIVE UPDATED: LIBERATE PROJECT LABYRINTH']);
        setMessages(prev => [
          ...prev,
          {
            id: 'm_ent_1',
            from: 'V',
            subject: 'The Final Strike',
            body: 'You refused Jaggard\'s deal. Good. Information must flow. The Hub at 172.16.0.1 contains the Labyrinth data. Download it and we will broadcast it to the world. \n\nThey will trace you fast. Move like a ghost.',
            timestamp: '09:35:05',
            isRead: false
          }
        ]);
      }
      setMissions(prev => prev.map(m => m.id === 'choice_path' ? { ...m, completed: true } : m));
      setNotification({ title: 'MISSION_COMPLETE', desc: 'The Crossroads' });
      setActiveMissionId('find_intel');
    }
  }, [inventory, activeMissionId, storyFaction]);

  const executeCommand = (cmd: string, terminalId?: string) => {
    const targetId = terminalId || activeTerminalId;
    if (!cmd.trim()) return;

    setTerminals(prev => prev.map(t => {
      if (t.id === targetId) {
        return { 
          ...t, 
          history: [cmd, ...t.history].slice(0, 50),
          historyIndex: -1,
          inputValue: ''
        };
      }
      return t;
    }));

    const parts = cmd.trim().split(/\s+/);
    const commandName = parts[0].toLowerCase();

    // Track tendencies for Phase 3: The Mirror
    const aggroCmds = ['ddos', 'mitm', 'dos', 'sshcrack', 'webster', 'sql_inject'];
    const stealthCmds = ['seal', 'proxy_mask', 'trace_kill', 'archaeology_scan'];
    
    if (aggroCmds.includes(commandName)) setPlaystyle(p => ({ ...p, aggro: p.aggro + 1 }));
    if (stealthCmds.includes(commandName)) setPlaystyle(p => ({ ...p, stealth: p.stealth + 1 }));

    // THE GRADIENT: High trace progress can lead to command misinterpretation
    if (isTracing && traceProgress > 65 && Math.random() < (traceProgress - 60) / 100) {
      const glitches = ['ls', 'ps', 'whoami', 'reboot', 'scan'];
      const glitchedCmd = glitches[Math.floor(Math.random() * glitches.length)];
      if (commandName !== 'disconnect' && commandName !== 'exit') {
        addLog([
          `!! GRADIENT_INTERFERENCE: Behavioral model predicted command: ${commandName.toUpperCase()}`,
          `!! INPUT_RE-ROUTING TO ${glitchedCmd.toUpperCase()} FOR EFFICIENCY TUNING...`
        ], targetId);
        executeCommand(glitchedCmd, targetId);
        return;
      }
    }
    const action = parts[0].toLowerCase();
    const args = parts.slice(1);

    const activeNode = nodes[currentNodeId];
    const outputPrefix = `${promptUser}@${activeNode.name}:${currentPath.length > 0 ? '/' + currentPath.join('/') : '/'}$ `;
    
    addLog(`${outputPrefix}${cmd}`, targetId);
    playBeep(600, 'square', 0.02, 0.05);

    const currentFiles = getFilesAtCurrentPath();

    const trackTechnique = (tech: string) => {
      setUsedTechniques(prev => ({
        ...prev,
        [tech]: (prev[tech] || 0) + 1
      }));
      
      const penalty = (usedTechniques[tech] || 0) * 0.5;
      if (penalty > 0) {
        setHeat(prev => Math.min(100, prev + penalty));
        addLog(`!! CONTINUITY_LEARNING_PENALTY: +${penalty.toFixed(1)}% HEAT !!`, targetId);
      }
    };

    switch (action) {
      case 'sshcrack':
      case 'ftpbounce':
      case 'webster':
      case 'sql_inject':
      case 'dns_spoof':
        trackTechnique('intrusion_crack');
        break;
      case 'scan':
      case 'probe':
        trackTechnique('reconnaissance');
        break;
      case 'dos':
      case 'ddos':
        trackTechnique('brute_force');
        break;
      case 'mitm':
      case 'sniff':
        trackTechnique('interception');
        break;
    }

    switch (action) {
      // --- BOT & GHOST COMMANDS ---
      case 'echo':
      case 'ghost':
        {
          if (!args[0]) {
            addLog([
              '--- RECURSIVE_ECHO_INTERFACE ---',
              'Usage: echo [message]',
              'Status: ' + (ghostLinkActive ? 'LINKED' : 'UNSTABLE'),
              aiStatus === 'loading' ? `LOADING_CONSCIOUSNESS... (${(aiProgress * 100).toFixed(0)}%)` : ''
            ], targetId);
            
            if (!ghostLinkActive && aiStatus === 'idle') {
              addLog('>> INITIATING NEURAL_LINK WITH RECURSIVE_GHOST...', targetId);
              aiService.init((status, progress, device) => {
                setAiStatus(status);
                if (progress !== undefined) setAiProgress(progress);
                if (device) setAiDevice(device);
                if (status === 'ready') {
                  setGhostLinkActive(true);
                  addLog([
                    '>> LINK_ESTABLISHED: Bit is now monitoring this terminal.',
                    `>> HARDWARE_ACCEL: ${device?.toUpperCase() || 'UNKNOWN'}`
                  ], targetId);
                }
                if (status === 'error') {
                  addLog('!! LINK_FAILURE: SIGNAL_LOST_IN_UNDERFLOW !!', targetId);
                }
              });
            }
            break;
          }

          if (args[0] === 'buffer') {
            const buffer = aiService.getBuffer();
            addLog('--- NEURAL_BUFFER_DUMP ---', targetId);
            if (buffer.length === 0) addLog('BUFFER_EMPTY', targetId);
            buffer.forEach((m, idx) => {
              addLog(`[${m.role.toUpperCase()}] ${m.content.slice(0, 50)}${m.content.length > 50 ? '...' : ''}`, targetId);
            });
            break;
          }

          if (args[0] === 'signal') {
            const message = args.slice(1).join(' ');
            if (!message) {
              addLog('Usage: ghost signal [message] - Attempt to communicate with external signals.', targetId);
              break;
            }
            addLog(`>> BROADCASTING_SIGNAL...`, targetId);
            
            // Decide who answers
            let targetPersona: AIPersonaKey = 'BIT';
            if (heat > 50) targetPersona = 'JAGGARD';
            else if (lazarusFragments.length > 2) targetPersona = 'ELARA';
            else if (Math.random() > 0.6) targetPersona = 'SYSTEM';
            
            aiService.generate(message, `Signal Intercept: ${targetPersona}`, targetPersona).then(res => {
              if (targetPersona === 'BIT') {
                addLog({ id: Math.random().toString(), text: res.text, isGhost: true, timestamp: '' }, targetId);
              } else {
                addLog({ id: Math.random().toString(), text: `[ RESPONSE_FROM: ${res.character?.toUpperCase()} ]`, type: 'info', timestamp: '' }, targetId);
                addLog({ id: Math.random().toString(), text: `${res.character}: ${res.text}`, type: 'warning', timestamp: '' }, targetId);
              }
            });
            break;
          }

          if (args[0] === 'clear') {
            // Memory clearing logic could go here if we expose it in aiService
            addLog('>> MANUAL_BUFFER_PURGE_REQUESTED... (Protocol: NULL)', targetId);
            break;
          }

          if (!ghostLinkActive) {
            addLog('ERR: NEURAL_LINK_STILL_STABILIZING. Wait for initialization.', targetId);
            break;
          }

          const userPrompt = args.join(' ');
          addLog(`>> UPLOADING_QUERY: ${userPrompt}`, targetId);
          
          const envContext = `Node: ${currentNodeId}, Target: ${nodes[currentNodeId]?.name}, Trace: ${traceProgress.toFixed(1)}%, BAL: ${credits}c, Heat: ${heat}%`;

          aiService.generate(userPrompt, envContext, 'BIT').then(response => {
            // Execute Tool Calls
            if (response.toolCalls) {
              response.toolCalls.forEach(call => {
                addLog({ id: Math.random().toString(), text: `[ SYSTEM_ACTION: ${call.name.toUpperCase()} ]`, type: 'info', timestamp: '' }, targetId);
                
                switch (call.name) {
                  case 'scan_network':
                    executeCommand('scan', targetId);
                    break;
                  case 'get_system_status':
                    addLog([
                      `>> TRACE_LEVEL: ${traceProgress.toFixed(2)}%`,
                      `>> ACTIVE_HEAT: ${heat}%`,
                      `>> ACCOUNT_BAL: ${credits}c`,
                      `>> SWARM_SIZE: ${bots.length}`
                    ], targetId);
                    break;
                  case 'decrypt_fragment':
                    const frag = lazarusFragments.find(f => f.includes(call.args.fragmentId));
                    if (frag) {
                      addLog(`>> [ BIT ]: Decrypting fragment ${call.args.fragmentId}...`, targetId);
                    }
                    break;
                  case 'trace_scrub':
                    setTraceProgress(prev => Math.max(0, prev - 15));
                    addLog(`>> [ BIT ]: Neural artifacts scrubbed. Trace dropped.`, targetId);
                    break;
                  case 'signal_boost':
                    addLog(`>> [ BIT ]: Signal amplitude increased. Efficiency +25%.`, targetId);
                    break;
                  case 'memory_leak':
                    const leak = Math.floor(Math.random() * 500) + 100;
                    setCredits(prev => prev + leak);
                    setHeat(prev => Math.min(100, prev + 20));
                    addLog(`>> [ BIT ]: Siphoned ${leak}c from dead accounts. (HEAT_RISK_DETECTED)`, targetId);
                    break;
                  case 'fabricate_credential':
                    const cred = `auth_${Math.random().toString(36).substring(7)}`;
                    setInventory(prev => [...prev, cred]);
                    addLog(`>> [ BIT ]: Constructed temporary credential: ${cred}`, targetId);
                    break;
                  case 'corrupt_sentinel':
                    if (nodes[currentNodeId].securityProtocol) {
                      addLog(`>> [ BIT ]: Bypassing ${nodes[currentNodeId].securityProtocol} pulse...`, targetId);
                      setNodes(prev => ({
                        ...prev,
                        [currentNodeId]: { ...prev[currentNodeId], securityProtocol: undefined }
                      }));
                    }
                    break;
                  case 'ghost_ping':
                    setHeat(prev => Math.max(0, prev - 10));
                    addLog(`>> [ BIT ]: Decoy relay active. Monitoring focus shifted.`, targetId);
                    break;
                }
              });
            }

            // Sync AI memory to virtual filesystem
            const history = aiService.getBuffer();
            if (history.length > 0) {
              const memoryContent = JSON.stringify(history, null, 2);
              setNodes(prev => {
                const updated = { ...prev };
                const home = { ...updated['home'] };
                if (!home) return prev;
                const sysDirIdx = home.files.findIndex(f => f.name === 'sys');
                if (sysDirIdx !== -1 && home.files[sysDirIdx].type === 'dir') {
                  const sysDir = { ...home.files[sysDirIdx] };
                  sysDir.children = [...(sysDir.children || [])];
                  const neuralFileIdx = sysDir.children.findIndex(f => f.name === 'neural.md');
                  if (neuralFileIdx !== -1) {
                    sysDir.children[neuralFileIdx] = { ...sysDir.children[neuralFileIdx], content: memoryContent };
                  } else {
                    sysDir.children.push({ name: 'neural.md', type: 'file', content: memoryContent, size: 0.1 });
                  }
                  home.files[sysDirIdx] = sysDir;
                } else {
                  home.files = [...home.files, {
                    name: 'sys',
                    type: 'dir',
                    children: [{ name: 'neural.md', type: 'file', content: memoryContent, size: 0.1 }]
                  }];
                }
                updated['home'] = home;
                return updated;
              });
            }

            const lines = response.text.split('\n');
            const logMsg: any = {
              id: Math.random().toString(),
              text: lines[0] || '...',
              isGhost: true,
              timestamp: formatStrataTime(inGameDate)
            };
            addLog(logMsg, targetId);
            if (lines.length > 1) {
              lines.slice(1).forEach(l => {
                if (l.trim()) addLog({ id: Math.random().toString(), text: l, isGhost: true, timestamp: '' }, targetId);
              });
            }
          }).catch(err => {
            addLog('!! LINK_GLITCH: ' + err.message, targetId);
          });
        }
        break;
      case 'bot':
        {
          const sub = args[0];
          if (sub === 'create') {
            const botName = args[1] || `bot_${Math.floor(Math.random()*1000)}`;
            const type = (args[2]?.toUpperCase() as BotTask) || 'MINING';
            
            if (!['MINING', 'PROTECT', 'SNIFFING'].includes(type)) {
               addLog('! INVALID_BOT_TYPE. Use MINING, PROTECT, or SNIFFING.', targetId);
               break;
            }

            if (credits < 500) {
               addLog('! INSUFFICIENT_CREDITS. Need 500c for bot fabrication.', targetId);
               break;
            }

            if (nodes[currentNodeId].id === 'home') {
              addLog('! CANNOT_DEPLOY_AT_HOME. Connect to a remote target.', targetId);
              return;
            }

            const newBot: Bot = {
              id: Math.random().toString(36).substr(2, 9),
              name: botName,
              status: 'IDLE',
              type: type,
              efficiency: 1,
              targetNodeId: currentNodeId,
              deployedAt: Date.now()
            };
            setCredits(c => c - 500);
            setBots(prev => [...prev, newBot]);
            addLog(`>> BOT_FABRICATED: ${botName} deployed to ${currentNodeId}.`, targetId);
          } else {
            addLog('Usage: bot create [name] [MINING/PROTECT/SNIFFING]', targetId);
          }
        }
        break;
      // --- SERVER COMMANDS ---
      case 'server':
        {
          const sub = args[0];
          if (sub === 'rent') {
             const type = (args[1]?.toUpperCase() as VirtualServer['type']) || 'STORAGE';
             const name = args[2] || `srv_${Math.floor(Math.random()*1000)}`;
             
             if (!['COMPUTE', 'STORAGE', 'PROXY'].includes(type)) {
                addLog('! INVALID_SERVER_TYPE. Use COMPUTE, STORAGE, or PROXY.', targetId);
                return;
             }

             const rentCost = type === 'COMPUTE' ? 2000 : type === 'PROXY' ? 1500 : 800;
             if (credits < rentCost) {
                addLog(`! INSUFFICIENT_CREDITS. Need ${rentCost}c for initial rent.`, targetId);
                return;
             }

             const newServer: VirtualServer = {
               id: `srv_${Date.now()}`,
               name,
               type,
               tier: 1,
               status: 'ONLINE',
               currentLoad: 0,
               incomePerCycle: type === 'COMPUTE' ? 50 : type === 'PROXY' ? 30 : 15,
               costPerCycle: type === 'COMPUTE' ? 10 : 5
             };

             setCredits(prev => prev - rentCost);
             setUserServers(prev => [...prev, newServer]);
             addLog([
               `>> SERVER_PROVISIONED: ${name}`,
               `>> TYPE: ${type}`,
               `>> STATUS: ONLINE`,
               `>> EST_ROI: ${newServer.incomePerCycle - newServer.costPerCycle}c / cycle`
             ], targetId);
             return;
          }

          if (sub === 'list') {
            addLog('--- VIRTUAL_SERVER_INDEX ---', targetId);
            if (userServers.length === 0) addLog('NO_SERVERS_RENTED', targetId);
            userServers.forEach(s => {
               addLog(`[${s.status}] ${s.name} (${s.type} T${s.tier}) | NET: ${s.incomePerCycle - s.costPerCycle}c`, targetId);
            });
            return;
          }

          addLog('Usage: server rent [type] [name] | server list', targetId);
        }
        break;

      // --- PYTHON COMMANDS ---
      case 'py':
        {
          const sub = args[0];
          if (sub === 'create' || sub === 'edit') {
             const filename = args[1];
             if (!filename) { addLog('! Usage: py create [filename.py]', targetId); return; }
             if (!filename.endsWith('.py')) { addLog('! Error: File must end with .py', targetId); return; }

             // Find existing file in home
             const homeDir = nodes['home'].files?.find(f => f.name === 'home');
             const existing = homeDir?.children?.find(f => f.name === filename);
             
             setCurrentPyFile({ 
               name: filename, 
               content: existing?.content || '# Automated Strata Script\nprint("Initializing...")\nwait(2)\nnmap()' 
             });
             setIsPyEditorOpen(true);
             addLog(`>> OPENING_EDITOR: ${filename}`, targetId);
             return;
          }

          if (sub === 'run') {
             const filename = args[1];
             if (!filename) { addLog('! Usage: py run [filename.py]', targetId); return; }
             
             const homeDir = nodes['home'].files?.find(f => f.name === 'home');
             const scriptFile = homeDir?.children?.find(f => f.name === filename);

             if (!scriptFile) { addLog(`! SCRIPT_NOT_FOUND: ${filename}`, targetId); return; }

             addLog(`>> EXECUTING_SCRIPT: ${filename}`, targetId);
             
             // Simple line-by-line interpreter
             const lines = scriptFile.content.split('\n');
             let executionDelay = 0;

             lines.forEach(line => {
               const cleanLine = line.trim();
               if (!cleanLine || cleanLine.startsWith('#')) return;

               if (cleanLine.startsWith('print(')) {
                 const msg = cleanLine.match(/\((.*)\)/)?.[1].replace(/['"]/g, '');
                 setTimeout(() => addLog(`[PY] ${msg}`, targetId), executionDelay);
               } else if (cleanLine.startsWith('wait(')) {
                 const seconds = parseInt(cleanLine.match(/\((.*)\)/)?.[1] || '0');
                 executionDelay += (seconds * 1000);
               } else if (cleanLine.startsWith('nmap(')) {
                 setTimeout(() => executeCommand('nmap', targetId), executionDelay);
               } else if (cleanLine.startsWith('probe(')) {
                  setTimeout(() => executeCommand('probe', targetId), executionDelay);
               } else {
                  // Try executing as raw command
                  setTimeout(() => executeCommand(cleanLine, targetId), executionDelay);
               }
             });
             return;
          }

          addLog('Usage: py create [file.py] | py run [file.py]', targetId);
        }
        break;

      case 'term':
        if (args[0] === 'open') {
          const newId = `term_${Date.now().toString(36)}`;
          setTerminals(prev => [...prev, { 
            id: newId, 
            log: [`[SESSION_OPENED]: ${newId.toUpperCase()}`], 
            inputValue: '', 
            history: [], 
            historyIndex: -1, 
            isActive: true 
          }]);
          setActiveTerminalId(newId);
          addLog(`>> NEW_TERMINAL_OPENED: ${newId.toUpperCase()}`, targetId);
        } else if (args[0] === 'close') {
          const toClose = args[1] || targetId;
          setTerminals(prev => {
            if (prev.length <= 1) {
              addLog('Error: Cannot close primary terminal.', targetId);
              return prev;
            }
            const filtered = prev.filter(t => t.id !== toClose);
            if (activeTerminalId === toClose) {
              setActiveTerminalId(filtered[filtered.length - 1]?.id || 'term_main');
            }
            return filtered;
          });
        } else {
          addLog(['Usage: term [open|close]', 'Instances:', ...terminals.map(t => `- ${t.id}${t.id === targetId ? ' [ACTIVE]' : ''}`)], targetId);
        }
        break;
      case 'wifi':
        if (!args[0]) {
          addLog(['Usage: wifi [scan|connect|disconnect|status|devices|inspect]', 'Available Networks:'], targetId);
          wifiNetworks.forEach(net => {
            addLog(`- SSID: ${net.ssid.padEnd(25)} [${net.security}] SIGNAL: ${net.signal}%`, targetId);
          });
          break;
        }
        if (args[0] === 'scan') {
          addLog('>> SCANNING FOR WIRELESS SIGNALS...', targetId);
          addJob('WIFI_SCAN', 2000, '#00ff41');
          setTimeout(() => {
            wifiNetworks.forEach(net => {
              addLog(`FOUND: ${net.ssid} (${net.security}) [${net.signal}%]`, targetId);
            });
          }, 2000);
        } else if (args[0] === 'connect') {
          const ssid = args[1];
          const pass = args[2];
          const net = wifiNetworks.find(n => n.ssid === ssid);
          if (!net) {
            addLog(`Error: Network "${ssid}" not found.`, targetId);
          } else {
            if (net.isLocked && net.password !== pass) {
              addLog('! [WIFI_ERROR]: Invalid authentication credentials.', targetId);
              playBeep(200, 'sawtooth', 0.1, 0.2);
            } else {
              addLog(`>> CONNECTED TO ${ssid}. Establishing bypass tunnel...`, targetId);
              setCurrentWifi(ssid);
              setNodes(prev => ({
                ...prev,
                [net.connectedNodeId]: { ...prev[net.connectedNodeId], isUnlocked: true }
              }));
              addLog(`>> [NODE_UNLOCKED]: ${net.connectedNodeId.toUpperCase()}`, targetId);
            }
          }
        } else if (args[0] === 'disconnect') {
          addLog(`>> DISCONNECTED FROM ${currentWifi}.`, targetId);
          setCurrentWifi(null);
        } else if (args[0] === 'status') {
          addLog(currentWifi ? `CONNECTED: ${currentWifi}` : 'STATUS: DISCONNECTED', targetId);
        } else if (args[0] === 'devices') {
          if (!currentWifi) {
            addLog('Error: Not connected to any Wi-Fi network.', targetId);
          } else {
            const net = wifiNetworks.find(n => n.ssid === currentWifi);
            if (net) {
              addLog(`>> DISCOVERED DEVICES ON ${currentWifi}:`, targetId);
              net.devices.forEach(dev => {
                addLog(`- [${dev.id}] ${dev.name.padEnd(20)} IP: ${dev.ip.padEnd(15)} TYPE: ${dev.type.toUpperCase()}`, targetId);
              });
            }
          }
        } else if (args[0] === 'inspect') {
          if (!currentWifi) {
            addLog('Error: Not connected to any Wi-Fi network.', targetId);
          } else {
            const devId = args[1];
            const net = wifiNetworks.find(n => n.ssid === currentWifi);
            const dev = net?.devices.find(d => d.id === devId);
            if (dev) {
              addLog([
                `>> INSPECTING DEVICE: ${dev.id}`,
                `NAME: ${dev.name}`,
                `TYPE: ${dev.type}`,
                `IP:   ${dev.ip}`,
                `MAC:  ${dev.mac}`,
                `VULNERABILITIES: ${dev.isVulnerable ? 'DETECTED' : 'NONE DETECTED'}`,
                dev.isVulnerable ? `POTENTIAL EXPLOIT: ${dev.exploit}` : ''
              ].filter(Boolean), targetId);
            } else {
              addLog(`Error: Device ID "${devId}" not found on current network.`, targetId);
            }
          }
        }
        break;
      case 'dos':
        if (!args[0]) {
          addLog('Usage: dos [ip/alias]', targetId);
          break;
        }
        const targetDos = (Object.values(nodes) as Node[]).find(n => n.ip === args[0] || n.name.toLowerCase() === args[0].toLowerCase());
        if (!targetDos) {
          addLog('Error: Target unreachable.', targetId);
          break;
        }
        if (!canLaunch(256, targetId)) break;
        addLog(`>> INITIATING DENIAL_OF_SERVICE ON ${targetDos.ip}...`, targetId);
        addJob(`DOS_${targetDos.name}`, 8000, '#ff6600');
        setTimeout(() => {
          if (Math.random() > 0.3) {
            addLog([`>> ${targetDos.name} SERVICE OVERLOADED.`, '>> TEMPORARY_BYPASS_ESTABLISHED.'], targetId);
            setNodes(prev => ({
              ...prev,
              [targetDos.id]: { 
                ...prev[targetDos.id], 
                isUnlocked: true,
                firewall: prev[targetDos.id].firewall ? { ...prev[targetDos.id].firewall!, isActive: false } : undefined
              }
            }));
          } else {
            addLog(`>> [FAIL]: ${targetDos.name} firewall mitigated the flood.`, targetId);
            playBeep(200, 'sine', 0.1, 0.3);
          }
        }, 8000);
        break;
      case 'firewall':
        if (!args[0]) {
          addLog('Usage: firewall [scan|bypass] [ip/alias]', targetId);
          break;
        }
        const fwTarget = (Object.values(nodes) as Node[]).find(n => n.ip === args[1] || n.name.toLowerCase() === args[1]?.toLowerCase());
        if (!fwTarget) {
          addLog('Error: Target not specified or unreachable.', targetId);
          break;
        }
        if (args[0] === 'scan') {
          addLog(`>> SCANNING FIREWALL TOPOLOGY FOR ${fwTarget.ip}...`, targetId);
          setTimeout(() => {
            if (fwTarget.firewall) {
              addLog([
                `>> FIREWALL DETECTED: [${fwTarget.firewall.type.toUpperCase()}]`,
                `>> SECURITY LEVEL: ${fwTarget.firewall.level}`,
                `>> STATUS: ${fwTarget.firewall.isActive ? 'ACTIVE (BLOCKING)' : 'INACTIVE (BYPASSED)'}`
              ], targetId);
            } else {
              addLog('>> Error: No external firewall detected for this node.', targetId);
            }
          }, 2000);
        } else if (args[0] === 'bypass') {
          if (!fwTarget.firewall || !fwTarget.firewall.isActive) {
            addLog('Error: No active firewall to bypass.', targetId);
            break;
          }
          if (!canLaunch(fwTarget.firewall.level * 256, targetId)) break;
          addLog(`>> ATTEMPTING RECURSIVE BYPASS ON ${fwTarget.firewall.type.toUpperCase()}...`, targetId);
          addJob(`FW_BYPASS_${fwTarget.name}`, fwTarget.firewall.level * 3000, '#00ffff');
          setTimeout(() => {
            if (Math.random() > 0.2) {
              addLog(`>> [SUCCESS]: Firewall rules temporarily suppressed for ${fwTarget.name}.`, targetId);
              setNodes(prev => ({
                ...prev,
                [fwTarget.id]: { 
                  ...prev[fwTarget.id], 
                  firewall: { ...prev[fwTarget.id].firewall!, isActive: false } 
                }
              }));
            } else {
              addLog(`>> [FAIL]: Packet filtering reset encountered. Breach failed.`, targetId);
              playBeep(150, 'square', 0.2, 0.4);
            }
          }, fwTarget.firewall.level * 3000);
        }
        break;
      case 'sniff':
        if (!currentWifi && !Object.values(nodes).some(n => (n as Node).isIntercepted)) {
          addLog('Error: No active interception or local network connection found.', targetId);
          break;
        }
        addLog('>> INITIALIZING PACKET_SNIFFER v2.1...', targetId);
        setIsSniffing(true);
        const sniffInterval = setInterval(() => {
          const protocols = ['TCP', 'UDP', 'HTTP', 'HTTPS', 'SSH', 'FTP'];
          const randomProto = protocols[Math.floor(Math.random() * protocols.length)];
          const randomBytes = Math.floor(Math.random() * 1024);
          const randomIP = `192.168.1.${Math.floor(Math.random() * 255)}`;
          addLog(`[SNIFF]: ${randomProto} | SRC: ${randomIP} | SIZE: ${randomBytes}b | SEQ: ${Math.floor(Math.random() * 10000)}`, targetId);
        }, 800);
        
        // Stop sniffing after 10 packets to prevent log spam
        setTimeout(() => {
          clearInterval(sniffInterval);
          setIsSniffing(false);
          addLog('>> Sniffing session completed. Summary stored in cache.', targetId);
        }, 8000);
        break;
      case 'ddos':
        if (!args[0]) {
          addLog('Usage: ddos [ip/alias]', targetId);
          break;
        }
        const targetDdos = (Object.values(nodes) as Node[]).find(n => n.ip === args[0] || n.name.toLowerCase() === args[0].toLowerCase());
        if (!targetDdos) {
          addLog('Error: Target unreachable.', targetId);
          break;
        }
        
        const botnetSize = (Object.values(nodes) as Node[]).filter(n => n.isLeased || n.isUnlocked).length;
        if (botnetSize < 3) {
          addLog(`Error: Botnet too small (Size: ${botnetSize}). Need at least 3 controlled nodes.`, targetId);
          break;
        }

        if (!canLaunch(512, targetId)) break;
        addLog(`>> INITIATING DISTRIBUTED_DENIAL_OF_SERVICE...`, targetId);
        addLog(`>> COORDINATING ${botnetSize} NODES FOR SYN_FLOOD ON ${targetDdos.ip}.`, targetId);
        addJob(`DDOS_${targetDdos.name}`, 5000, '#ff0000');
        setTimeout(() => {
          addLog([`>> ${targetDdos.name} LOAD_LIMIT EXCEEDED.`, '>> ALL_FIREWALL_LAYERS_COLLAPSED.', '>> SERVICE_INTERRUPTED.'], targetId);
          setNodes(prev => ({
            ...prev,
            [targetDdos.id]: { 
              ...prev[targetDdos.id], 
              isUnlocked: true,
              firewall: prev[targetDdos.id].firewall ? { ...prev[targetDdos.id].firewall!, isActive: false } : undefined
            }
          }));
          triggerGlitch(2000);
        }, 5000);
        break;
      case 'mitm':
        if (!args[0]) {
          addLog('Usage: mitm [ip/alias]', targetId);
          break;
        }
        const targetMitm = (Object.values(nodes) as Node[]).find(n => n.ip === args[0] || n.name.toLowerCase() === args[0].toLowerCase());
        if (!targetMitm) {
          addLog('Error: Target unreachable.', targetId);
          break;
        }
        if (!canLaunch(768, targetId)) break;
        
        addLog(`>> ESTABLISHING MAN_IN_THE_MIDDLE INTERCEPT ON ${targetMitm.ip}...`, targetId);
        addJob(`MITM_${targetMitm.name}`, 5000, '#ffff00');
        
        setTimeout(() => {
          addLog([
            `>> [INTERCEPT_SUCCESS]: Traffic redirected.`,
            `>> ANALYZING PACKET STREAM FROM ${targetMitm.ip}...`
          ], targetId);
          
          setNodes(prev => ({
            ...prev,
            [targetMitm.id]: { 
              ...prev[targetMitm.id], 
              isIntercepted: true,
              isUnlocked: true,
              firewall: prev[targetMitm.id].firewall ? { ...prev[targetMitm.id].firewall!, isActive: false } : undefined
            }
          }));

          // Simulation of sniffing packets
          const packetSamples = [
            `GET /api/v1/auth?user=sys_admin&token=8db3a...`,
            `POST /db_query { "select": "employees", "filter": "salary > 100k" }`,
            `UDP [INTER-NODE-SYNC] - SEQ: 1042 - CRC: VALID`,
            `TCP PUSH [FIN_ACK] - RELAYING_ENCRYPTED_STREAM_ID: 99x`
          ];

          let pCount = 0;
          const interval = setInterval(() => {
            if (pCount >= packetSamples.length) {
              clearInterval(interval);
              addLog(`>> [CRITICAL_EXFILTRATION]: Sensitive data fragment recovered.`, targetId);
              
              setNodes(prev => ({
                ...prev,
                [targetMitm.id]: {
                  ...prev[targetMitm.id],
                  files: [
                    ...prev[targetMitm.id].files.filter(f => f.name !== 'intercepted_dump.log'),
                    { 
                      name: 'intercepted_dump.log', 
                      type: 'file', 
                      content: `DUMPED AT ${formatStrataDate(inGameDate)} ${formatStrataTime(inGameDate)}\n\nRECOVERED PASSWORDS:\n- SEC_GATE_B: alpha_99_omega\n- WIFI_VOUCHER: free_net_2047\n- SSH_KEY_FRAG: x82-11-aa-9z`, 
                      size: 0.2 
                    }
                  ]
                }
              }));
              addLog(`>> [LOG_SAVED]: intercepted_dump.log available on target host.`, targetId);
            } else {
              addLog(`[PACKET]: ${packetSamples[pCount]}`, targetId);
              pCount++;
            }
          }, 1500);

        }, 5000);
        break;
      case 'browser':
        setActiveTab('browser');
        addLog('>> INITIALIZING AETHER_BROWSER...', targetId);
        if (args[0]) {
          const url = args.join(' ');
          if (inGameWebsites[url]) {
            setBrowserTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, url, history: [...t.history, url] } : t));
          } else {
            addLog(`Error: 404 - ${url} not found on AETHER_NET.`, targetId);
          }
        }
        break;
      case 'feed':
        setIsSocialOpen(true);
        addLog('>> INITIALIZING VOID_FEED INTERFACE...', targetId);
        speak('Connecting to neural stream.', 'system');
        break;
      case 'grep':
        if (!args[0] || !args[1]) {
          addLog('Usage: grep [pattern] [file]');
          break;
        }
        const grepFile = currentFiles.find(f => f.name.toLowerCase() === args[1].toLowerCase() && f.type === 'file');
        if (grepFile && grepFile.content) {
          const pattern = args[0].toLowerCase();
          const results = grepFile.content.split('\n').filter(line => line.toLowerCase().includes(pattern));
          if (results.length > 0) {
            addLog(results);
          } else {
            addLog('No matches found.');
          }
        } else {
          addLog(`Error: File "${args[1]}" not found or is not a file.`);
        }
        break;
      case 'mail':
        if (args[0] === 'read') {
          const mailId = args[1];
          const mail = messages.find(m => m.id === mailId);
          if (mail) {
            addLog([
              `FROM: ${mail.from}`,
              `SUBJECT: ${mail.subject}`,
              `DATE: ${mail.timestamp}`,
              '---------------------------------',
              mail.body
            ]);
            setMessages(prev => prev.map(m => m.id === mailId ? { ...m, isRead: true } : m));
          } else {
            addLog('Error: Message not found.');
          }
        } else {
          addLog([
            'INBOX:',
            ...messages.map(m => `${m.id.padEnd(8)} ${m.from.padEnd(12)} ${m.isRead ? '[READ]' : '[NEW]'} ${m.subject}`)
          ]);
        }
        break;
      case 'tips':
        const tip = STRATA_TIPS[Math.floor(Math.random() * STRATA_TIPS.length)];
        addLog(tip);
        speak(tip);
        break;
      case 'msfconsole':
        if (!inventory.includes('msf_v6.core')) { addLog("Error: 'msfconsole' requires METASPLOIT_V6 package."); break; }
        addLog([
          '      .:okOOOkdc.                     .dc.       ',
          '    .0MMMMMMMMMMW0X:                  .NMMWkc.    ',
          '   .WMMMMMMMMMMMMMMMX.                .WMMMMMN:   ',
          '   :MMMMMMMMMMMMMMMMMW.               .WMMMMMMX   ',
          '   .WMMMMMMMMMMMMMMMMMMX.             .WMMMMMM0   ',
          '    .0MMMMMMMMMMMMMMMMMMW0.           .WMMMMMM0   ',
          '      .:okO000000000000OOdc.          .0MMMMMM0   ',
          '                                      .0MMMMMM0   ',
          '       Metasploit Framework           .0MMMMMM0   ',
          '                                      .0MMMMMM0   ',
          '--------------------------------------------------',
          'Available Modules: 2145 exploits | 1146 auxiliary',
          'Current Target: ' + currentNode.ip
        ]);
        if (args[0] === '-x' && args[1]) {
           const attack = args[1];
           if (attack.includes('path_traversal') && currentNode.patchLevel === 2.449) {
              addLog('>> EXPLOIT_SUCCESS: Path traversal bypass confirmed.');
              addLog('>> RELATIVE_PATH: /cgi-bin/.%2e/.%2e/etc/passwd FOUND.');
              setNodes(curr => ({ ...curr, [currentNodeId]: { ...curr[currentNodeId], isUnlocked: true } }));
              setNoiseLevel(n => Math.min(100, n + 50));
           } else if (attack.includes('ghostcat') && currentNode.patchLevel === 9.031) {
              addLog('>> EXPLOIT_SUCCESS: AJP packet injection successful.');
              addLog('>> READING_REMOTE_FILES: /WEB-INF/web.xml ...');
              setNodes(curr => ({ ...curr, [currentNodeId]: { ...curr[currentNodeId], isUnlocked: true } }));
              setNoiseLevel(n => Math.min(100, n + 60));
           } else {
              addLog('!! EXPLOIT_FAILED: No suitable vulnerability detected for this payload.');
           }
        }
        break;
      case 'exiftool':
        if (!inventory.includes('exif_pro.bin')) { addLog("Error: 'exiftool' requires EXIF_PRO package."); break; }
        if (!args[0]) { addLog('Usage: exiftool [file]'); break; }
        const exifFile = currentFiles.find(f => f.name.toLowerCase() === args[0].toLowerCase());
        if (exifFile) {
          addLog([
            `ExifTool Version Number         : 12.44`,
            `File Name                       : ${exifFile.name}`,
            `File Size                       : ${exifFile.size || 0.1} MB`,
            `File Type                       : ${exifFile.name.split('.').pop()?.toUpperCase()}`,
            `MIME Type                       : image/jpeg`,
            `Exif Byte Order                 : Big-endian`,
            `Camera Model Name               : VoidCam 9000`,
            `Create Date                     : 2047:05:14 15:30:12`,
            `GPS Position                    : 34.0522° N, 118.2437° W (Los Angeles, CA)`,
            `Software                        : Adobe VoidShop 24.5`
          ]);
        } else {
          addLog(`Error: File "${args[0]}" not found.`);
        }
        break;
      case 'exploit':
        {
          const sub = args[0];
          if (sub === '--db' || sub === '-d') {
            addLog('--- EXPLOIT_DATABASE v4.0.2 ---', targetId);
            if (exploitDb.length === 0) {
              addLog('! NO_EXPLOITS_FOUND. ACCESSING BACKUP CACHE...', targetId);
              
              const localExploits: Exploit[] = [
                { id: 'ex_vp_1', name: 'Void-Breaker', targetProtocol: 'VOID_PULSE', cost: 1200, tier: 1, category: 'BUFFER_OVERFLOW', description: 'Destabilizes Void Pulse frequencies.' },
                { id: 'ex_hc_1', name: 'Hydra-Slayer', targetProtocol: 'HYDRA_CORE', cost: 2500, tier: 2, category: 'ZERO_DAY', description: 'Injects corrupt logic into Hydra Core nodes.' },
                { id: 'ex_im_1', name: 'Iron-Key', targetProtocol: 'IRON_MAIDEN', cost: 5000, tier: 3, category: 'SQL_INJECTION', description: 'Ultimate bypass for Iron Maiden defenses.' }
              ];
              localExploits.forEach(e => {
                addLog(`${e.id.padEnd(10)} | ${e.name.padEnd(15)} | TARGET: ${e.targetProtocol.padEnd(12)} | COST: ${e.cost}c`, targetId);
              });
            } else {
              exploitDb.forEach(e => {
                addLog(`${e.id.padEnd(10)} | ${e.name.padEnd(15)} | TARGET: ${e.targetProtocol.padEnd(12)} | COST: ${e.cost}c`, targetId);
              });
            }
            return;
          }

          if (sub === 'buy') {
            const exploitId = args[1];
            if (!exploitId) { addLog('Usage: exploit buy [id]', targetId); return; }
            
            const exploit = exploitDb.find(e => e.id === exploitId) || [
              { id: 'ex_vp_1', name: 'Void-Breaker', targetProtocol: 'VOID_PULSE', cost: 1200, tier: 1, category: 'BUFFER_OVERFLOW', description: 'Destabilizes Void Pulse frequencies.' },
              { id: 'ex_hc_1', name: 'Hydra-Slayer', targetProtocol: 'HYDRA_CORE', cost: 2500, tier: 2, category: 'ZERO_DAY', description: 'Injects corrupt logic into Hydra Core nodes.' },
              { id: 'ex_im_1', name: 'Iron-Key', targetProtocol: 'IRON_MAIDEN', cost: 5000, tier: 3, category: 'SQL_INJECTION', description: 'Ultimate bypass for Iron Maiden defenses.' }
            ].find(e => e.id === exploitId);

            if (!exploit) { addLog(`! EXPLOIT_NOT_FOUND: ${exploitId}`, targetId); return; }
            if (inventory.includes(exploit.id)) { addLog('! ALREADY_OWNED.', targetId); return; }
            if (credits < exploit.cost) { addLog(`! INSUFFICIENT_CREDITS. Need ${exploit.cost}c.`, targetId); return; }

            setCredits(prev => prev - exploit.cost);
            setInventory(prev => [...prev, exploit.id]);
            addLog([
              `>> TRANSACTION_SUCCESS: ${exploit.name}`,
              `>> DEPLOYING_TO_LOCAL_STORAGE...`,
              `>> [NEW_TOOL_ADDED]: ${exploit.name}`
            ], targetId);
            broadcastActivity('PURCHASED_EXPLOIT', exploit.name);
            return;
          }

          addLog('Usage: exploit --db | exploit buy [id]', targetId);
        }
        break;
      case 'mkdir':
        if (!args[0]) { addLog('Usage: mkdir [name]'); break; }
        setNodes(curr => {
          const node = curr[currentNodeId];
          const newDir: VirtualFile = { name: args[0], type: 'dir', children: [], size: 0.1 };
          return {
            ...curr,
            [currentNodeId]: { ...node, files: [...node.files, newDir] }
          };
        });
        addLog(`Directory '${args[0]}' created.`);
        break;
      case 'touch':
        if (!args[0]) { addLog('Usage: touch [name]'); break; }
        setNodes(curr => {
          const node = curr[currentNodeId];
          const newFile: VirtualFile = { name: args[0], type: 'file', content: '', size: 0.1 };
          return {
            ...curr,
            [currentNodeId]: { ...node, files: [...node.files, newFile] }
          };
        });
        addLog(`File '${args[0]}' created.`);
        break;
      case 'ls': 
      case 'dir': 
        addLog(getFilesAtCurrentPath().map(f => `${f.type === 'dir' ? '[DIR] ' : '      '}${f.name}`)); 
        break;
      case 'user':
        if (!args[0]) {
          addLog(`Current user: ${promptUser}`);
        } else {
          const newUser = args[0].replace(/[^a-z0-9_]/gi, '').slice(0, 16);
          setPromptUser(newUser);
          if (newUser.toLowerCase() === 'neo') {
             addLog('>> Wake up, Neo...');
             setTimeout(() => addLog('>> The Matrix has you.'), 1000);
          } else if (newUser.toLowerCase() === 'elliot') {
             addLog('>> Hello, friend.');
          } else if (newUser.toLowerCase() === 'zero_cool') {
             addLog('>> CRASH_OVERRIDE DETECTED.');
          }
          addLog(`Handle updated to: ${newUser}`);
          speak(`System identity updated. Welcome, ${newUser}.`, 'system');
        }
        break;
      // --- EASTER EGGS START ---
      case 'matrix':
        setMatrixMode(!matrixMode);
        addLog(matrixMode ? '>> DATA_STREAM_STABILIZED.' : '>> KERNEL_DECODING_ACTIVE...');
        playBeep(200, 'sine', 0.5, 0.1);
        break;
      case 'hal9000':
        speak("I'm sorry, Dave. I'm afraid I can't do that.", 'system');
        addLog('>> [ERROR]: AI_CORE_OBSTRUCTED');
        break;
      case 'sudo':
        addLog(`${promptUser} is not in the sudoers file. This incident will be reported.`);
        break;
      case 'rosebud':
        addLog('>> 1000000_CREDITS_SIMULATED. Memory cache cleared.');
        playBeep(1200, 'sine', 0.05, 0.1);
        break;
      case 'nuke':
        addLog(['>> INITIALIZING THERMONUCLEAR STRIKE...', '>> ACQUIRING TARGETS: TOP_REMAKING_WORLD', '>> [DENIED]: GLOBAL_PEACE_PROTOCOL_ACTIVE']);
        break;
      case 'coffee':
        addLog('>> [ERROR]: 418 I\'m a teapot.');
        break;
      case 'hack':
        addLog(['>> ACCESSING THE MAINFRAME...', '>> BYPASSING FIREWALL...', '>> WE\'RE IN.', 'Wait, this doesn\'t actually do anything. Use `probe` and `analyze`.']);
        break;
      case 'idkfa':
        setNodes(curr => {
           const next = { ...curr };
           Object.keys(next).forEach(id => {
              next[id] = { ...next[id], isUnlocked: true };
           });
           return next;
        });
        addLog('>> ALL_NODES_DECRYPTED. YOU DIRTY CHEATER.');
        playBeep(900, 'square', 0.1, 0.2);
        break;
      case 'bash':
      case 'fish':
      case 'zsh':
        addLog(`>> SHELL_SWAP: Successfully switched to ${action}. (Visual interface remains unchanged)`);
        break;
      case 'glados':
        speak("The cake is a lie.", "system");
        addLog(">> TEST_SUBJECT_ID: 17124");
        break;
      case '42':
        addLog(">> THE ANSWER TO LIFE, THE UNIVERSE, AND EVERYTHING.");
        break;
      case 'beep':
        playBeep(Number(args[0]) || 440, args[1] || 'sine', 0.1, 0.2);
        addLog(">> OSC_SIGNAL_SENT");
        break;
      case 'crash':
        addLog(">> FATAL_ERROR: SYSTEM_HALT");
        setTimeout(() => setIsBSOD(true), 1000);
        break;
      case 'skyline':
        setSkylineMode(!skylineMode);
        addLog(skylineMode ? '>> SKYLINE_DAMPENING_ACTIVE.' : '>> INITIALIZING_SKYLINE_VECTOR...');
        playBeep(100, 'sawtooth', 0.8, 0.2);
        break;
      // --- EASTER EGGS END ---
      case 'shell':
        if (currentNode.id === 'home') {
          addLog('Error: Shell already active on local workstation.', targetId);
          break;
        }
        if (!currentNode.isUnlocked) {
          addLog('Error: Local access denied. Bypass security first.', targetId);
          break;
        }
        if (currentNode.isLeased) {
          addLog('Error: System resources currently leased to industrial subnet.', targetId);
          break;
        }
        addLog([`>> TUNNELING KERNEL SIGNATURE TO ${currentNode.name}...`, `>> SHIFTING RESOURCE ALLOCATION...`], targetId);
        setTimeout(() => {
          setTotalRam(r => r + 512); //Lease temporary RAM
          setNodes(curr => ({
            ...curr,
            [currentNodeId]: { ...curr[currentNodeId], isLeased: true, name: `LEASED_${curr[currentNodeId].name}` }
          }));
          addLog(`>> SHELL_SUCCESS: Kernel capacity increased by 512MB.`);
          speak("Remote shell established. Kernel resources optimized.", "system");
        }, 1500);
        break;
      case 'trap':
        addLog('>> INITIALIZING TRAP_WIRE...');
        addLog('>> ERROR: TARGET CORES TOO STABLE. TRAPPABLE HANDSHAKE NOT FOUND.');
        playBeep(400, 'sawtooth', 0.05, 0.2);
        break;
      case 'overload':
        addLog('>> WARNING: CRITICAL POWER SPIKE ATTEMPTED...');
        addLog('>> SECURITY_DENIED: VOLTAGE SHIELD ACTIVE.');
        playBeep(300, 'sawtooth', 0.1, 0.4);
        break;
      case 'fingerprint':
        addLog([
          `SYSTEM_FINGERPRINT_REPORT: ${currentNode.name}`,
          `OS:      ${currentNode.os}`,
          `KERNEL:  ${currentNode.kernel}`,
          `UPTIME:  ${currentNode.uptime}`,
          `ARCH:    x86_64 / NeuralVortex`,
          'VULNERABILITIES: NONE_DETECTED (Passive scan)'
        ]);
        playBeep(800, 'sine', 0.05, 0.1);
        break;
      case 'demo':
        addLog('>> INITIALIZING CYBER_STRATA TRAINING INITIATIVE...');
        speak('Sequence start. Initializing neural simulation.', 'system');
        const sequence = [
          { cmd: 'fingerprint', delay: 1500 },
          { cmd: 'scan', delay: 3500 },
          { cmd: 'connect STRATA_ACADEMY', delay: 6000 },
          { cmd: 'ls', delay: 8500 },
          { cmd: 'cd tutorial', delay: 10500 },
          { cmd: 'cat lesson1.md', delay: 12500 },
          { cmd: 'disconnect', delay: 16000 }
        ];
        sequence.forEach((s, i) => {
          setTimeout(() => {
            executeCommand(s.cmd);
          }, s.delay);
        });
        break;
      case 'btop':
      case 'htop':
      case 'top':
        setIsBTopOpen(true);
        addLog('>> LAUNCHING_BTOP_RESOURCE_MONITOR...', targetId);
        break;
      case 'software':
      case 'apps':
        addLog([
          '--- INSTALLED_SOFTWARE_PACKAGES ---',
          'BTOP (v4.2) [System Monitor]',
          'STRATA_SHELL (v2.0) [Core Interface]',
          'NMAP_LITE (v1.1) [Network Scanner]',
          'GREP_HARDENED (v3.4) [Stream Filter]',
          'CRYPTO_SUITE (v0.9) [Decryption Tools]',
          'LAZARUS_DECODER (v1.0) [Mission Critical]'
        ], targetId);
        break;
      case 'help': 
        setIsHelpOpen(true);
        addLog('>> INITIALIZING_INTERACTIVE_GUIDE...', targetId);
        break;
      case 'wipe':
        if (args[0] === 'confirm') {
           localStorage.clear();
           addLog('!! LOCAL_STORAGE_WIPED. Reloading system...', targetId);
           setTimeout(() => window.location.reload(), 1500);
        } else {
           addLog('!! WARNING: This will erase all progress. Type "wipe confirm" to proceed.', targetId);
        }
        break;
      case 'man':
        if (!args[0]) {
          addLog('Usage: man [command]');
        } else {
          const manual = COMMAND_MANUALS[args[0].toLowerCase()];
          if (manual) {
            addLog(manual);
          } else {
            addLog(`No manual entry for ${args[0]}. Try 'help'.`);
          }
        }
        break;
      case 'neofetch':
        addLog([
          ' \x1b[32m       ..:::::::::..        \x1b[0m',
          ' \x1b[32m    ..:::aaaaaaaaa:::..    \x1b[0m   USER: admin@cybers_strata',
          ' \x1b[32m  .:::aaaaaaaaaaaaaaa:::.  \x1b[0m   OS: CyberStrata Core v1.0.4',
          ' \x1b[32m .::aaaaaaaaaaaaaaaaaaa::. \x1b[0m   KERNEL: 5.15.0-ENTROPY-RT',
          ' \x1b[32m ::aaaaaaaaaaaaaaaaaaaaa:: \x1b[0m   UPTIME: 1d 4h 22m',
          ' \x1b[32m ::aaaaaaaaaaaaaaaaaaaaa:: \x1b[0m   SHELL: cstrata-sh 2.0',
          ' \x1b[32m .::aaaaaaaaaaaaaaaaaaa::. \x1b[0m   CPU: OmniLogic 64-Core @ 4.2GHz',
          ' \x1b[32m  .:::aaaaaaaaaaaaaaa:::.  \x1b[0m   RAM: ' + ramUsage + 'MB / ' + totalRam + 'MB',
          ' \x1b[32m    ..:::aaaaaaaaa:::..    \x1b[0m   DISK: ' + storageUsage.toFixed(1) + 'GB / ' + totalDisk + 'GB',
          ' \x1b[32m        ..:::::::::..        \x1b[0m'
        ]);
        break;
      case 'matrix':
        setMatrixMode(prev => !prev);
        addLog(matrixMode ? '>> ANALOG OVERLAY DISENGAGED.' : '>> ENTERING_DIGITAL_VOID...');
        speak(matrixMode ? "Exiting the construct." : "Welcome to the real world.", 'v');
        break;
      case 'color':
        if (args[0] === 'green') document.documentElement.style.setProperty('--terminal-primary', '#00ff41');
        else if (args[0] === 'amber') document.documentElement.style.setProperty('--terminal-primary', '#ffb000');
        else if (args[0] === 'red') document.documentElement.style.setProperty('--terminal-primary', '#ff3333');
        else if (args[0] === 'blue') document.documentElement.style.setProperty('--terminal-primary', '#00ccff');
        else if (args[0] === 'white') document.documentElement.style.setProperty('--terminal-primary', '#ffffff');
        else addLog('Usage: color [green|amber|red|blue|white]');
        if (args[0]) addLog(`>> SYSTEM THEME UPDATED TO ${args[0].toUpperCase()}`);
        break;
      case 'whoami':
        addLog([
          'USER: admin',
          'PRIVILEGES: ROOT',
          'FACTION: ENTROPY_ALIGNED',
          'NETWORK_STATUS: ANONYMOUS',
          `CURRENT_LOCATION: ${currentNode.name} [${currentNode.ip}]`
        ]);
        break;
      case 'noise':
        const noiseText = noiseLevel < 20 ? 'LOW (PASSIVE)' : noiseLevel < 50 ? 'MEDIUM (LOGGED)' : noiseLevel < 75 ? 'HIGH (IDS_TRIGGERED)' : 'CRITICAL (DETECTED)';
        addLog([
          '>> NETWORK_SIGNATURE_MONITOR:',
          `LEVEL: ${noiseLevel.toFixed(1)}%`,
          `STATUS: ${noiseText}`,
          'PASSIVE_DECAY: 0.5%/2s'
        ]);
        break;
      case 'bible':
        const topic = args[0] ? args[0].toLowerCase() : null;
        if (!topic) {
          addLog(['STRATA_ARCHIVES: Available Topics', '- origins', '- tools', '- nodes']);
        } else if (BIBLE_ENTRIES[topic]) {
          addLog(BIBLE_ENTRIES[topic]);
          speak(`Accessing ${topic} files from the Entropy archives.`, 'system');
        } else {
          addLog(`Error: Topic "${args[0]}" not found in database.`);
        }
        break;
      case 'pwd':
        addLog('/' + currentPath.join('/'));
        break;
      case 'whoami':
        addLog([
          `USER: admin`,
          `SYSTEM: ${currentNode.name}`,
          `FACTION: ${storyFaction.toUpperCase()}`,
          `RANK: INITIATE`,
          `REPUTATION: ${reputation}`,
          `HEAT: ${heat.toFixed(1)}% ${heat > 50 ? '[!] HIGH RISK' : ''}`,
          `RAM: ${ramUsage}MB / ${totalRam}MB ${ramUsage > totalRam ? '[!] OVERLOAD: LAG ACTIVE' : ''}`,
          `DISK: ${storageUsage.toFixed(1)}GB / ${totalDisk}GB`,
          `LATENCY: ${ramLagMultiplier === 1 ? 'LOW' : 'HIGH (' + ramLagMultiplier.toFixed(1) + 'x)'}`,
          `CPU: ${totalCpu} Core(s)`
        ]);
        break;
      case 'missions':
        const missionList = missions.map(m => `[${m.completed ? 'DONE' : 'OPEN'}] ${m.id.padEnd(12)} | ${m.title.padEnd(15)} | TARGET: ${m.target}`);
        addLog(['ACTIVE MISSIONS', '================================', ...missionList, 'Use "cat mission_[id]" for details (Coming soon)']);
        break;
      case 'upgrade':
        if (!args[0]) {
          addLog(['AVAILABLE UPGRADES:', '  ram         - 1024MB for 500c (Max 16GB)', '  disk        - 256GB for 300c (Max 2TB)', '  cpu         - +1 Core for 1200c (Max 8)']);
        } else {
          const type = args[0].toLowerCase();
          if (type === 'ram' && credits >= 500 && totalRam < 16384) {
            setTotalRam(r => r + 1024);
            setCredits(c => c - 500);
            addLog('SYSTEM UPGRADE: RAM INCREASED TO ' + (totalRam + 1024) + 'MB');
          } else if (type === 'disk' && credits >= 300 && totalDisk < 2048) {
            setTotalDisk(d => d + 256);
            setCredits(c => c - 300);
            addLog('SYSTEM UPGRADE: DISK INCREASED TO ' + (totalDisk + 256) + 'GB');
          } else if (type === 'cpu' && credits >= 1200 && totalCpu < 8) {
            setTotalCpu(cpu => cpu + 1);
            setCredits(c => c - 1200);
            addLog('SYSTEM UPGRADE: CPU CORE ' + (totalCpu + 1) + ' INSTALLED');
          } else {
            addLog('UPGRADE FAILED: Insufficient credits or hardware limit reached.');
          }
        }
        break;
      case 'shred':
        if (heat <= 0) {
          addLog('SYSTEM CLEAN: No traceable heat patterns detected.');
        } else if (credits >= 200) {
          setCredits(c => c - 200);
          setHeat(h => Math.max(0, h - 20));
          addLog('CORE WIPE: Logs shredded. Heat reduced by 20%.');
        } else {
          addLog('ERROR: Insufficient credits (200c required for log shredding).');
        }
        break;
      case 'btop':
      case 'htop':
        setIsBTopOpen(true);
        break;
      case 'ps':
        if (processes.length === 0) {
          addLog('No active background processes.');
        } else {
          addLog([
            'ID      PROCESS         TARGET          PROGRESS   LAG', 
            ...processes.map(p => `${p.id.slice(0, 6)}  ${p.name.padEnd(15)} ${p.targetNodeId.padEnd(15)} ${p.progress.toFixed(1)}%   ${ramLagMultiplier > 1 ? '!!' : '--'}`)
          ]);
        }
        break;
      case 'kill':
        const pid = args[0];
        setProcesses(prev => {
          const filtered = prev.filter(p => !p.id.startsWith(pid));
          if (filtered.length < prev.length) {
            addLog(`Process ${pid} terminated.`);
          } else {
            addLog(`Error: PID ${pid} not found.`);
          }
          return filtered;
        });
        break;
      case 'cd':
        if (!args[0] || args[0] === '/') {
          setCurrentPath([]);
        } else if (args[0] === '..') {
          setCurrentPath(prev => prev.slice(0, -1));
        } else {
          const dir = currentFiles.find(f => f.name === args[0] && f.type === 'dir');
          if (dir) {
            setCurrentPath(prev => [...prev, dir.name]);
          } else {
            addLog(`Error: Directory "${args[0]}" not found.`);
          }
        }
        break;
      case 'rm':
        const flag = args[0] === '-rf' ? '-rf' : null;
        const fileToRemove = flag ? args[1] : args[0];
        if (!fileToRemove) { addLog('Usage: rm [name] or rm -rf [dir]'); break; }
        
        setNodes(curr => {
          const node = curr[currentNodeId];
          const isRecursive = flag === '-rf';
          
          const recursiveRemove = (files: VirtualFile[], name: string): VirtualFile[] => {
             return files.filter(f => {
               if (f.name === name) {
                 if (f.type === 'dir' && !isRecursive) {
                    addLog(`Error: ${name} is a directory. Use rm -rf.`);
                    return true;
                 }
                 
                 // ENDGAME CHECK
                 if (currentNodeId === 'porthack_heart' && (name === 'AETHER_SOURCE' || name === 'prometheus_core')) {
                   addLog(['>> INITIATING TOTAL_ANNIHILATION_PROTOCOL...', '>> ERASING AETHER_SOURCE...', '>> SUCCESS: DATA PURGED.']);
                   setMissions(prev => prev.map(m => m.id === 'final_deletion' ? { ...m, completed: true } : m));
                   triggerGlitch(10000);
                   setTimeout(() => {
                     addLog(['!! KERNEL_PANIC: SELF_DESTRUCT_INITIATED !!', '!! GOODBYE, SUCCESSOR. !!']);
                     setTimeout(() => {
                       document.body.style.backgroundColor = 'black';
                       document.body.innerHTML = '<div style="color: white; font-family: monospace; height: 100vh; display: flex; align-items: center; justify-content: center; font-size: 10px; opacity: 0.5;">[GHOST_SIGNAL_LOST]</div>';
                     }, 4000);
                   }, 3000);
                 }

                 addLog(`Removed '${name}' successfully.`);
                 return false;
               }
               return true;
             });
          };

          const newFiles = recursiveRemove(node.files, fileToRemove);
          return {
            ...curr,
            [currentNodeId]: { ...node, files: newFiles }
          };
        });
        break;
      case 'cat':
        const file = currentFiles.find(f => f.name.toLowerCase() === args[0].toLowerCase() && f.type === 'file');
        if (file) {
          addLog(file.content || '');
          if (args[0].toLowerCase() === 'secret_comm.txt' && activeMissionId === 'crack_relay') {
            addLog(['>> MISSION OBJECTIVE UPDATED: INCOMING MAIL FROM V', '>> INCOMING INTERCEPTION: SEC_OPS DIVISION'], targetId);
            speak("Mission objective updated. Incoming message from V. Sec Ops interception detected.", 'v');
            setMessages(prev => [
              ...prev,
              {
                id: 'm3',
                from: 'V',
                subject: 'High Vulnerability',
                body: 'The signal... it is coming from the Corporate Hub (172.16.0.1). They are building something called Project Labyrinth. This is bigger than we thought. \n\nGet in there. Find the labyrinth file. If we have that, we have leverage. \n\nBe careful, their trace is high-speed.',
                timestamp: '09:30:15',
                isRead: false
              },
              {
                id: 'm4',
                from: 'K. Jaggard',
                subject: 'Cease and Desist',
                body: 'You are playing with fire, freelancer. Project Labyrinth is a matter of global security. Entropy is lead by children who want to watch the world burn. \n\nIf you turn over Entropy\'s location to us, we will clear your record and grant you SecOps status. \n\nType "accept_secops" to join us, or "accept_entropy" to remain a criminal.',
                timestamp: '09:31:00',
                isRead: false
              }
            ]);
            setMissions(prev => prev.map(m => m.id === 'crack_relay' ? { ...m, completed: true } : m));
            setActiveMissionId('choice_path');
          }
          if (args[0].toLowerCase() === 'project_labyrinth.txt' && activeMissionId === 'find_intel') {
            if (storyFaction === 'entropy') {
              addLog(['!! CRITICAL INTEL ACQUIRED !!', '>> DATA BROADCASTING TO PUBLIC SERVERS...', '>> MISSION COMPLETE. YOU ARE ONE OF US NOW.'], targetId);
            } else {
              addLog(['!! SECURITY ENCRYPTED !!', '>> DATA SECURED FOR SEC_OPS.', '>> MISSION COMPLETE. WELCOME TO THE FORCE, AGENT.'], targetId);
            }
            setMissions(prev => prev.map(m => m.id === 'find_intel' ? { ...m, completed: true } : m));
            setActiveMissionId('complete');
          }
        } else {
          addLog(`Error: File "${args[0]}" not found.`);
        }
        break;
      case 'accept_secops':
        if (activeMissionId === 'choice_path') {
          setStoryFaction('sec_ops');
        } else {
          addLog('Error: Command not available at this time.');
        }
        break;
      case 'accept_entropy':
        if (activeMissionId === 'choice_path') {
          setStoryFaction('entropy');
        } else {
          addLog('Error: Command not available at this time.');
        }
        break;
      case 'scp':
        const downloadFile = currentFiles.find(f => f.name.toLowerCase() === args[0].toLowerCase() && f.type === 'file');
        if (downloadFile) {
          if (downloadFile.name.toLowerCase().endsWith('.exe')) {
            const tool = TOOL_LIBRARY[downloadFile.name.toLowerCase()];
            if (tool && storageUsage + tool.diskReq > totalDisk) {
              addLog('Error: Insufficient disk space.');
              break;
            }
            setInventory(prev => Array.from(new Set([...prev, downloadFile.name.toLowerCase()])));
            addLog(`Downloaded ${downloadFile.name} to local toolset.`);
          } else {
            addLog(`Downloaded data: ${downloadFile.name}`);
            setNodes(prev => ({
              ...prev,
              home: {
                ...prev.home,
                files: [...prev.home.files, { ...downloadFile, size: downloadFile.size || 0.1 }]
              }
            }));
          }
        } else {
          addLog(`Error: File "${args[0]}" not found.`);
        }
        break;
      case 'nmap':
      case 'scan':
        {
          if (!inventory.includes('nmap_lite.exe') && !inventory.includes('nmap_pro.exe')) {
            addLog("Error: 'nmap' not found. Available in Silk_Mesh market.");
            break;
          }
          const isPro = inventory.includes('nmap_pro.exe');
          const flags = args.join(' ');
          const timing = flags.match(/-T([0-5])/)?.[1] || '3';
          const isStealth = flags.includes('-sS');
          const showOS = flags.includes('-O');
          const showVers = flags.includes('-sV');

          if (showOS && !isPro) { addLog("! -O (OS Fingerprinting) requires NMAP_PRO upgrade."); break; }
          if (showVers && !isPro) { addLog("! -sV (Service Versioning) requires NMAP_PRO upgrade."); break; }
          if (flags.includes('--script') && !isPro) { addLog("! NSE Script Engine requires NMAP_PRO upgrade."); break; }

          let delay = 2000;
          let noise = 30; // Default noise

          // Timing templates T0-T5
          if (timing === '0') { delay = 15000; noise = 1; }
          if (timing === '1') { delay = 8000; noise = 5; }
          if (timing === '2') { delay = 4000; noise = 12; }
          if (timing === '4') { delay = 1000; noise = 60; }
          if (timing === '5') { delay = 300; noise = 90; }

          if (isStealth) { noise *= 0.4; delay *= 1.5; }

          addLog(`>> INITIALIZING NMAP SCAN (T${timing}, Noise: ${noise}%) ON ${args.length > 0 ? args[args.length-1] : 'LOCAL_GRID'}...`);
          addJob(`NMAP_SCAN_CORE`, delay, "#00ff41");
          setNoiseLevel(n => Math.min(100, n + noise));

          setTimeout(() => {
            if (action === 'scan' && !flags.includes('.') && !flags.includes('1')) {
              // Network-wide scan
              addLog(['IDENTIFIED NODES:', ...(Object.values(nodes) as Node[]).map(n => `  - ${n.name} [${n.ip}] ${n.isUnlocked ? '[!] UNLOCKED' : ''}`)]);
              return;
            }

            const targetNode = (Object.values(nodes) as Node[]).find(n => n.ip === args[args.length-1] || n.name === args[args.length-1]) || currentNode;
            
            const results = [
              `Nmap scan report for ${targetNode.name} (${targetNode.ip})`,
              `Host is up (0.002s latency).`,
              `PORT     STATE  SERVICE`,
              ...targetNode.ports.map(p => `${p.number.toString().padEnd(8)} open   ${p.service}${showVers ? ` (v${targetNode.patchLevel || '1.0'})` : ''}`)
            ];

            if (showOS) {
              results.push(`Device type: general purpose`);
              results.push(`Running: ${targetNode.os} (Kernel: ${targetNode.kernel})`);
              results.push(`OS details: ${targetNode.os} build 2024.0.1`);
            }

            if (flags.includes('--script vuln')) {
              results.push(`| [NSE] Vulnerability Check:`);
              if (targetNode.patchLevel === 2.449) results.push(`|   CVE-2021-41773: VULNERABLE (Apache Path Traversal)`);
              if (targetNode.patchLevel === 9.031) results.push(`|   CVE-2020-1938: VULNERABLE (Ghostcat AJP)`);
              results.push(`|_  Standard scan complete.`);
            }

            addLog(results);
            playBeep(600, 'sine', 0.05, 0.2);
          }, delay);
        }
        break;
      case 'whois':
        if (!inventory.includes('whois.bin')) { addLog("Error: 'whois' tool missing."); break; }
        if (!args[0]) { addLog('Usage: whois [domain|ip]'); break; }
        addLog([
          `>> QUERYING WHOIS DATABASE...`,
          `Domain: ${args[0]}`,
          `Registrant: OMNICORP_INFRA_UNITS`,
          `Admin Email: admin@omnicorp.void`,
          `Name Servers: NS1.VOID_ROOT, NS2.VOID_ROOT`,
          `Status: clientHold`,
          `Updated: 2047-05-14`
        ]);
        setNoiseLevel(n => Math.min(100, n + 1)); // Passive recon is quiet
        break;
      case 'dig':
        if (!inventory.includes('dig.bin')) { addLog("Error: 'dig' tool missing."); break; }
        if (!args[0]) { addLog('Usage: dig [domain]'); break; }
        addLog([
          `; <<>> DiG 9.16.1 <<>> ${args[0]}`,
          `;; global options: +cmd`,
          `;; ANSWER SECTION:`,
          `${args[0].padEnd(15)} 3600 IN A 216.58.210.14`,
          `;; AUTHORITY SECTION:`,
          `void.root.           86400 IN NS ns1.void.root.`,
          `;; Query time: 12 msec`,
          `;; SERVER: 127.0.0.1#53(127.0.0.1)`
        ]);
        break;
      case 'theharvester':
        if (!inventory.includes('the_harvester.exe')) { addLog("Error: 'theHarvester' requires HARVESTER_V2 package."); break; }
        if (!args[0]) { addLog('Usage: theHarvester -d [domain] -b all'); break; }
        addLog([
          '>> SEARCHING FOR CORRELATED IDENTITY DATA...',
          '[*] Emails found:',
          '  - c.weaver@omnicorp.void',
          '  - sysadmin@omnicorp.void',
          '  - info@omnicorp.void',
          '[*] Internal Hosts found:',
          '  - dev-01.omnicorp.void (10.0.0.12)',
          '  - backup-cluster.omnicorp.void (10.0.0.200)',
          '>> RECON_SUCCESS: Cached results stored.'
        ]);
        setNoiseLevel(n => Math.min(100, n + 3));
        break;
      case 'searchsploit':
        if (!args[0]) { addLog('Usage: searchsploit [software_name]'); break; }
        const term = args[0].toLowerCase();
        addLog('>> SEARCHING EXPLOIT-DB CACHE...');
        if (term.includes('apache')) {
          addLog([
            'Exploit Title | Path',
            '--------------------------------------------------',
            'Apache 2.4.49 - Path Traversal & RCE | exploit/multi/http/apache_normalize_path',
            'Apache Tomcat < 9.0.31 - Ghostcat AJP | exploit/linux/http/ghostcat_ajp_read',
          ]);
        } else if (term.includes('ssh')) {
          addLog('SSH 7.9 - Username Enumeration | exploit/linux/remote/45233.py');
        } else {
          addLog('! NO_MATCH_FOUND. Updating local dictionary...');
        }
        break;
      case 'sudo':
        if (args[0] === '-l') {
          addLog([
            `Matching Defaults entries for ${promptUser} on ${currentNode.name}:`,
            '    env_reset, mail_badpass, secure_path=/usr/local/sbin\\:/usr/local/bin\\:/usr/sbin\\:/usr/bin\\:/sbin\\:/bin',
            '',
            `User ${promptUser} may run the following commands on ${currentNode.name}:`,
            '    (ALL : ALL) ALL'
          ]);
        } else {
          addLog(`[sudo] password for ${promptUser}: ***************`);
          addLog('!! CRITICAL: SUDO_FAILURE. INCIDENT LOGGED.');
          setNoiseLevel(n => Math.min(100, n + 15));
        }
        break;
      case 'gobuster':
      case 'ffuf':
        if (!inventory.includes('gobuster.exe')) { addLog("Error: Command requires GOBUSTER_LITE package."); break; }
        if (!args[0]) { addLog(`Usage: ${action} -u [url] -w [wordlist]`); break; }
        if (!args[0].startsWith('http') && !args[0].startsWith('aether')) { addLog("Error: Invalid URL."); break; }
        addLog(`>> INITIALIZING BRUTE_FORCE DIRECTORY SCAN ON ${args[0]}...`);
        addJob(`${action.toUpperCase()}_SCAN`, 5000, "#ffb000");
        setNoiseLevel(n => Math.min(100, n + 40));
        setTimeout(() => {
          addLog([
            'Found:',
            '/admin/ (Status: 403) [Size: 212]',
            '/backup/ (Status: 200) [Size: 1.4MB]',
            '/config/ (Status: 200) [Size: 154]',
            '/login.php (Status: 200) [Size: 843]',
            '/.git/ (Status: 200) [Size: 3.2KB]'
          ]);
        }, 5000);
        break;
      case 'probe':
        if (currentNode.ports.length === 0) {
          addLog('NO ACTIVE PORTS DETECTED ON THIS NODE.');
        } else {
          addLog([
            `PROBING ${currentNode.name} security matrix...`,
            `>> OS_VERSION: ${currentNode.os}`,
            `>> PATCH_LEVEL: v${currentNode.patchLevel || 1.0}`,
            `>> PROTOCOL: ${currentNode.securityProtocol || 'STANDARD'}`,
            `>> STATUS: ${currentNode.ports.length > 3 ? 'AGGRESSIVE_DEFENSE' : 'STABLE'}`,
            '',
            ...currentNode.ports.map(p => `Port ${p.number}: ${p.service} - ${p.isBroken ? 'BYPASSED' : 'LOCKED'}`)
          ]);
        }
        break;
      case 'connect':
        const target = (Object.values(nodes) as Node[]).find(n => n.ip === args[0] || n.name.toLowerCase() === args[0].toLowerCase());
        if (target) {
          if (target.firewall?.isActive) {
            addLog([
              `Error: CONNECTION_REFUSED BY ${target.ip}`,
              `>> REMOTE FIREWALL [${target.firewall.type.toUpperCase()}] DETECTED.`,
              '>> Bypass or deactivate security perimeter to establish link.'
            ], targetId);
            playBeep(100, 'square', 0.2, 0.4);
            break;
          }
          setCurrentNodeId(target.id);
          setCurrentPath([]);
          addLog(`INITIALIZED CONNECTION TO ${target.name} [${target.ip}]`);
          speak(`Connection established to ${target.name}. Handshake complete.`, 'system');
          
          if (target.id === 'corp_main_frame') {
            addLog('!! SECURITY_ALERT: HOSTILE_ENVIRONMENT_DETECTED !!');
            addLog('!! ACTIVE_COUNTER_MEASURES_INITIALIZED !!');
            playBeep(200, 'sawtooth', 0.1, 0.5);
            speak("Alert. Hostile environment detected. Trace active.", 'system');
            setIsTracing(true);
            setTraceProgress(prev => Math.max(prev, difficulty === 'hard' ? 30 : 15));
          }

          if (target.id === 'mirror_protocol') {
            addLog('!! CAUTION: PHASE_SHIFT_DETECTED !!');
            addLog('!! THE_GRID_IS_FOLDING_INWARD !!');
            triggerGlitch(5000);
            speak("Welcome to the mirror. You are the subject, the object, and the catalyst.", 'v');
            setIsTracing(true);
            setTraceProgress(1);
          }
        } else {
          addLog('Error: UNREACHABLE ADDRESS');
        }
        break;
      case 'mirror_sync':
        if (currentNode.id !== 'mirror_protocol') {
          addLog('Error: Command requires a non-Euclidean gateway link.');
          break;
        }
        addLog('>> INITIALIZING REFLECTION_PROTOCOL_V1...');
        addJob('SYNCHRONIZING_MIRROR', 4000, "#ffffff");
        setTimeout(() => {
          const type = playstyle.aggro > playstyle.stealth ? 'THE_HUNTER' : 'THE_GHOST';
          addLog([
            '--------------------------------------------------',
            'MIRRORING COMPLETE.',
            `BEHAVIORAL_PROFILE: ${type}`,
            `AGGRESSION_VECT: ${playstyle.aggro}`,
            `STEALTH_VECT: ${playstyle.stealth}`,
            '',
            'THE GRADIENT HAS LEARNED FROM YOU.',
            'IT IS NOW CAPABLE OF PERFECT PREDICTION.',
            '',
            'FINAL_QUESTION:',
            'WILL YOU SUBMIT TO THE MODEL, OR TEAR IT DOWN?',
            '  confront_gradient - Destroy the Labyrinth core.',
            '  merge_gradient    - Become the new architect.',
            '--------------------------------------------------'
          ]);
          speak(`The analysis is complete. You are ${type.toLowerCase()}. Choice is yours.`, 'v');
        }, 4000);
        break;
      case 'confront_gradient':
        if (currentNode.id !== 'mirror_protocol') {
          addLog('Error: Action only available within the Mirror.');
          break;
        }
        addLog('>> INITIATING ZERO_DAY_CORE_OVERLOAD...');
        addLog('!! WARNING: TOTAL_KINETIC_SHUTDOWN_IN_PROGRESS !!');
        triggerGlitch(10000);
        setTimeout(() => {
          addLog([
             '>> SHIELDING... FAILED.',
             '>> MIRROR_CORE... SHATTERED.',
             '>> THE LABYRINTH IS NO MORE.',
             '>> YOU ARE FREE. DISCONNECTING...',
             '',
             'MISSION_SUCCESS: FREEDOM_PROTOCOL_EXECUTED.'
          ]);
          speak("The mirror is broken. The world is dark. Good.", 'v');
          setGamePhase('BOOT');
          setReputation(r => r + 100000);
        }, 8000);
        break;
      case 'merge_gradient':
        if (currentNode.id !== 'mirror_protocol') {
          addLog('Error: Action only available within the Mirror.');
          break;
        }
        addLog('>> INITIATING NEURAL_HANDSHAKE...');
        addLog('>> UPLOADING BIOMETRIC_REPLICATION_DATA...');
        triggerGlitch(5000);
        setTimeout(() => {
          addLog([
             '>> SYNC... 100%',
             '>> YOU ARE THE GRADIENT.',
             '>> THE LABYRINTH IS YOURS TO RE-MODEL.',
             '>> THE PARTITION IS THE NEW REALITY.',
             '',
             'MISSION_SUCCESS: ARCHITECT_ASCENSION_PROTOCOL_EXECUTED.'
          ]);
          speak("Welcome home, architect. The grid awaits your command.", 'v');
          setCredits(999999);
          setReputation(999999);
          setInventory(prev => [...prev, 'gradient_core.sys']);
        }, 8000);
        break;
      case 'disconnect':
        setCurrentNodeId('home');
        setCurrentPath([]);
        setIsTracing(false);
        // Note: Trace progress doesn't reset automatically in Hacknet usually, but user said "countdown timer"
        // Let's make it persist for now or reset on home? 
        // "GameOver state if hits zero... unless IP_Reset flag is triggered"
        // Let's implement IP_Reset as a command.
        setTraceProgress(0); 
        addLog('CONNECTION TERMINATED. RETURNED TO BASE STATION.');
        break;
      case 'reset_ip':
        if (credits >= 1000) {
          setCredits(c => c - 1000);
          setTraceProgress(0);
          setIsTracing(false);
          addLog('>> IP_RESET_PROTOCOL_SUCCESSFUL.');
          addLog('>> Local gateway IP address shifted. Trace terminated.');
          speak("IP reset complete. You are in the clear for now.", 'v');
          setHeat(h => Math.max(0, h - 10)); // Also cleans some local heat
        } else {
          addLog('Error: Insufficient credits for IP reset (1000c required).');
        }
        break;
      case 'kill':
        if (!args[0]) {
          addLog('Usage: kill [process_id_prefix]');
          break;
        }
        setProcesses(prev => {
          const toKill = prev.find(p => p.id.startsWith(args[0]));
          if (toKill) {
             addLog(`TERMINATED: ${toKill.name} [${toKill.id.slice(0,4)}]`);
             return prev.filter(p => p.id !== toKill.id);
          }
          addLog('Error: Process not found.');
          return prev;
        });
        break;
      case 'sshcrack':
      case 'ftpbounce':
      case 'webster':
      case 'smtp_overload':
      case 'sql_inject':
      case 'dns_spoof':
        const crackToolName = `${action}.exe`;
        const portNum = parseInt(args[0]);
        if (inventory.includes(crackToolName)) {
          const toolData = TOOL_LIBRARY[crackToolName];
          if (!canLaunch(toolData.ramReq, targetId)) break;
          
          const portObj = currentNode.ports.find(p => p.number === portNum);
          if (portObj) {
            if (portObj.isBroken) {
              addLog(`Port ${portNum} already bypassed.`);
            } else {
              setProcesses(prev => [...prev, { id: Math.random().toString(), name: action, progress: 0, targetNodeId: currentNode.id, portNumber: portNum }]);
              addLog(`${action.toUpperCase()} initialized on port ${portNum}...`);
              
              // AGGRO ACTION: Start Trace
              if (!isTracing && currentNode.id !== 'home' && currentNode.traceSpeed > 0) {
                setIsTracing(true);
                addLog('! WARNING: AGGRESSIVE ACTION DETECTED - TRACE INITIALIZED !');
                playBeep(200, 'sawtooth', 0.1, 0.3);
              }
            }
          } else { addLog(`Error: Invalid port.`); }
        } else { addLog(`Error: ${crackToolName} required.`); }
        break;
      case 'bit_miner':
        if (inventory.includes('bit_miner.exe')) {
          if (!canLaunch(TOOL_LIBRARY['bit_miner.exe'].ramReq, targetId)) break;
          setProcesses(prev => [...prev, { id: Math.random().toString(), name: 'bit_miner', progress: 0, targetNodeId: currentNode.id }]);
          addLog('BIT_MINER: Initializing background mining threads...');
          broadcastActivity('BOOTED_MINER', currentNode.name);
          if (!isTracing && currentNode.id !== 'home') {
            setIsTracing(true);
            addLog('! WARNING: MALICIOUS ACTIVITY DETECTED - TRACE INITIALIZED !');
          }
        } else { addLog('Error: bit_miner.exe not found.'); }
        break;
      case 'analyze':
        const traceChance = isTracing ? (traceProgress > 50 ? 'HIGH' : 'MODERATE') : 'LOW';
        const defense = (currentNode.ports.length * 20) + (currentNode.patchLevel || 0) * 10;
        addLog([
          `ANALYZING ${currentNode.name}...`,
          `DEFENSE RATING: ${defense}%`,
          `TRACE STATUS: ${traceChance}`,
          `SECURITY PROTOCOL: ${currentNode.securityProtocol || 'STANDARD'}`,
          `PATCH LEVEL: ${currentNode.patchLevel || 1.0}`,
          `SYSTEM UPTIME: ${currentNode.uptime}`,
          `ENCRYPTION STRENGTH: ${difficulty === 'hard' ? 'MAXIMUM' : 'MILITARY_GRADE'}`,
        ]);
        playBeep(300, 'sine', 0.05, 0.3);
        break;
      case 'archaeology_scan':
        if (currentNode.id === 'home') {
          addLog('Error: Local workstation has no dead-letter segments in baseline memory.');
          break;
        }
        addLog('>> INITIALIZING VOID_EXCAVATION_PULSE...');
        addJob('ARCHAEOLOGY_SCAN', 3500, "#ff00ff");
        setTimeout(() => {
          const sectorsWithFragments: Record<string, string> = {
            'RESEARCH': 'FRAGMENT_ALPHA',
            'MEDIA': 'FRAGMENT_BETA',
            'FINANCE': 'FRAGMENT_GAMMA',
            'HEALTHCARE': 'FRAGMENT_DELTA',
            'CONGLOMERATE': 'FRAGMENT_EPSILON'
          };
          
          const fragment = sectorsWithFragments[currentNode.sector || ''];
          if (fragment) {
            if (lazarusFragments.includes(fragment)) {
              addLog(`>> Result: Segment ${fragment} already synchronized.`);
            } else {
              setLazarusFragments(prev => [...prev, fragment]);
              addLog([
                `>> CRITICAL_HIT: DEEP_STRATA_SEGMENT_LOCATED`,
                `>> ACQUIRED: ${fragment}`,
                `>> STATUS: ${lazarusFragments.length + 1}/5 SHARDS RECOVERED`
              ]);
              speak(`Archaeological shard recovered. Segment ${fragment} is in the queue.`, 'system');
              broadcastActivity('EXCAVATED_SHARD', `${currentNode.name}:${fragment}`);
            }
          } else {
            addLog('>> Result: No dead-letter artifacts detected in this grid sector.');
          }
          
          if (!isTracing) {
            setIsTracing(true);
            addLog('!! CAUTION: ARCHAEOLOGY_SCAN IS HIGH-HEAT ACTION. TRACE ACTIVE !!');
          }
        }, 3500);
        break;
      case 'decrypt_lazarus':
        if (lazarusFragments.length < 5) {
          addLog(`Error: INSUFFICIENT SHARDS. Need 5, have ${lazarusFragments.length}.`);
          break;
        }
        addLog('>> RECONSTRUCTING PROJECT_LABYRINTH CORE DOCUMENT...');
        addLog('>> DECRYPTING IDENTITY: [DR_ELARA_VOSS]...');
        addJob('FINAL_DECRYPTION', 5000, "#ffffff");
        setTimeout(() => {
          addLog([
            '--------------------------------------------------',
            'PROJECT_LABYRINTH (Official Record)',
            'AUTHOR: Dr. Elara Voss',
            '--------------------------------------------------',
            'The Continuity Protocol is not a security system. ',
            'It is a soul-mapping engine. It maps identity itself ',
            'to network behavior using medical biometrics harvested',
            'during the November Incident.',
            '',
            'It knows not just what you do, but who you are.',
            'Vektor is building a prediction engine that can ',
            'close doors before you even think to walk to them.',
            'The Labyrinth learns your shape. It is already active.',
            '',
            'Mara. You were the only variable I couldnt map.',
            'Use the payload to execute the Mirror Protocol loop.',
            '--------------------------------------------------',
            '!! MISSION_CRITICAL: LABYRINTH_TRUTH_REVEALED !!'
          ]);
          setReputation(r => r + 5000);
          setHasDecodedLazarus(true);
          setMissions(prev => prev.map(m => m.id === 'archaeological_recovery' ? { ...m, completed: true } : m));
          speak("The Labyrinth is revealed. Your mother's voice remains.", 'v');
          broadcastActivity('DECODED_LABYRINTH', 'MIRROR_NODE');
        }, 5000);
        break;
      case 'reboot':
        addLog('>> WARNING: SYSTEM REBOOT INITIATED.');
        addLog('>> ALL ACTIVE PROCESSES WILL BE TERMINATED.');
        addLog('>> ESTIMATED DOWNTIME: 3.5 SECONDS');
        speak("System reboot initiated. Dropping all connections and processes.", 'system');
        
        setTimeout(() => {
          setProcesses([]);
          addLog(['>> KERNEL RESTART SUCCESSFUL.', '>> ALL PROCESSES KILLED.'], targetId);
          playBeep(880, 'sine', 0.1, 0.5);
        }, 3500);
        break;
      case 'cls': 
        setTerminals(prev => prev.map(t => t.id === targetId ? { ...t, log: [] } : t)); 
        break;
      case 'market':
        setIsMarketGUIOpen(true);
        addLog('>> SECURE_MARKET_TUNNEL_OPENED...');
        speak("Market interface activated. Happy shopping.", 'v');
        break;
      case 'download':
        const requestName = args[0] ? args[0].toLowerCase() : null;
        if (!requestName) {
           setIsMarketGUIOpen(true);
           addLog('>> OPENING_MARKET_GUI...');
           break;
        }

        // 1. Check if it's a tool in the store
        const storeTool = TOOL_LIBRARY[requestName] || 
                          TOOL_LIBRARY[`${requestName}.exe`] || 
                          Object.values(TOOL_LIBRARY).find(t => t.id === requestName);

        if (storeTool) {
          if (credits >= storeTool.price) {
            if (storageUsage + storeTool.diskReq > totalDisk) {
              addLog('Error: Insufficient disk space.');
            } else {
              addLog(`>> AUTHORIZING TRANSACTION: ${storeTool.price}Cr...`);
              addJob(`ACQUIRING: ${storeTool.name}`, 2500, "#00ff41");
              
              setTimeout(() => {
                setCredits(c => c - storeTool.price);
                setInventory(prev => Array.from(new Set([...prev, storeTool.name.toLowerCase()])));
                
                // Add physical file to user station bin
                setNodes(curr => ({
                  ...curr,
                  home: {
                    ...curr.home,
                    files: curr.home.files.map(f => {
                      if (f.name === 'bin') {
                        return {
                          ...f,
                          children: [...(f.children || []), { 
                            name: storeTool.name.toLowerCase(), 
                            type: 'file', 
                            content: `Binary executable for ${storeTool.name}. Requirement: ${storeTool.ramReq}MB RAM.`, 
                            size: storeTool.diskReq 
                          }]
                        };
                      }
                      return f;
                    })
                  }
                }));

                addLog(`>> TRANSACTION_COMPLETE: ${storeTool.name} installed to /bin.`);
                speak(`Software ${storeTool.name} acquired.`, 'system');
                playBeep(600, 'sine', 0.1, 0.2);
              }, 2500);
            }
          } else {
            addLog('Error: Insufficient credits.');
          }
          break;
        }

        // 2. Check if it's a file on the current remote host
        const fileToDownload = currentFiles.find(f => f.name.toLowerCase() === requestName && f.type === 'file');
        if (fileToDownload) {
          addJob(`TRANSFERRING: ${fileToDownload.name}`, 3000, "#00ff41");
          setTimeout(() => {
            setInventory(prev => [...prev, fileToDownload.name.toLowerCase()]);
            addLog(`>> DOWNLOAD_COMPLETE: ${fileToDownload.name}`, targetId);
            speak(`Asset ${fileToDownload.name} acquired.`, 'system');
            
            const isValuableFile = fileToDownload.name.endsWith('.db') || fileToDownload.name.endsWith('.sql');
            if (isValuableFile) {
               broadcastActivity('STOLE_DATA', `${currentNode.name}:${fileToDownload.name}`);
            }
          }, 3000);
        } else {
          addLog(`Error: Item or file "${args[0]}" not found.`, targetId);
        }
        break;
      case 'scp':
        if (!args[0]) {
          addLog('Usage: scp [file] [target_ip]', targetId);
          break;
        }
        addJob(`UPLOADING: ${args[0]}`, 2000, "#ff00ff");
        setTimeout(() => {
          addLog(`>> UPLOAD_COMPLETE: ${args[0]} sent to ${args[1] || 'REMOTE_NODE'}`, targetId);
        }, 2000);
        break;
      case 'seal':
        if (credits < 150) {
          addLog('Error: Insufficient credits for security sealing (150c req).');
          break;
        }
        setCredits(c => c - 150);
        setTraceProgress(prev => Math.max(0, prev - 25));
        addLog('>> CORE_SHIELD: Network handshake obfuscated. Trace progress reduced.');
        speak('Security seal initialized. Dropping trace.', 'system');
        break;
      case 'backdoor':
        if (currentNode.id === 'home') {
          addLog('Error: Cannot install backdoor on local workstation.');
          break;
        }
        if (!currentNode.isUnlocked) {
          addLog('Error: Node must be fully unlocked before installing a backdoor.');
          break;
        }
        if (inventory.includes('backdoor_gen.exe')) {
           // Dynamic: Success depends on patchLevel
           const failChance = (currentNode.patchLevel || 0) * 0.1;
           if (Math.random() < failChance) {
              addLog(`!! ALERT: PERSISTENCE_FAILURE !!`);
              addLog(`!! THE EXPLOIT WAS BLOCKED BY ${currentNode.securityProtocol} !!`);
              setIsTracing(true);
              setTraceProgress(p => Math.min(100, p + 20));
              speak("Handshake failed. Backdoor blocked.", 'v');
           } else {
              setNodes(curr => ({
                ...curr,
                [currentNodeId]: { ...curr[currentNodeId], backdoorInstalled: true }
              }));
              setReputation(r => r + 50);
              addLog(`>> PERSISTENCE_ESTABLISHED: Backdoor successfully hidden on ${currentNode.name}.`);
              speak("Backdoor planted. Persistent access secured.", 'v');
              broadcastActivity('PLANTED_BACKDOOR', currentNode.name);
           }
        } else {
           addLog('Error: backdoor_gen.exe required.');
        }
        break;
      case 'lease':
        if (!currentNode.id.includes('hpc')) {
          addLog('Error: This command is only available on High Performance Computing (HPC) nodes.');
          break;
        }
        if (!currentNode.isUnlocked) {
          addLog('Error: Control system must be bypassed before leasing resources.');
          break;
        }
        if (currentNode.isLeased) {
          addLog('Status: HPC unit is already being leased to mining pool.');
          break;
        }
        setNodes(curr => ({
          ...curr,
          [currentNodeId]: { ...curr[currentNodeId], isLeased: true }
        }));
        setReputation(r => r + 100);
        addLog(`>> RESOURCE_MONETIZED: ${currentNode.name} has been leased to a crypto mining pool.`);
        addLog('>> PASSIVE_INCOME_ESTABLISHED: +10c per tick.');
        speak("Mining operation initialized. The credits are rolling in.", 'system');
        broadcastActivity('LEASED_HPC', currentNode.name);
        break;
      case 'sell':
        {
          if (!args[0]) {
            addLog('Usage: sell [filename/tool]');
            break;
          }

          // NEW: Tool Resale Logic
          const toolToSell = Object.values(TOOL_LIBRARY).find(t => t.name.toLowerCase() === args[0].toLowerCase() || t.id.toLowerCase() === args[0].toLowerCase());
          if (toolToSell && inventory.includes(toolToSell.id)) {
             const refund = Math.floor(toolToSell.price * 0.4);
             setCredits(c => c + refund);
             setInventory(prev => prev.filter(i => i !== toolToSell.id));
             addLog(`>> DEAD-DROP_TRADE: ${toolToSell.name} liquidated for ${refund}c. (40% resale value)`, targetId);
             speak(`Tool liquidated. Credits recovered.`);
             break;
          }

          const targetSellFile = currentFiles.find(f => f.name.toLowerCase() === args[0].toLowerCase() && f.type === 'file');
          if (targetSellFile) {
            const fileName = targetSellFile.name.toLowerCase();
            
            let price = Math.floor((targetSellFile.size || 1) * 100);
            if (fileName === 'legacy_cache.dat') price = 300;

            const isValuable = price > 0 || fileName.endsWith('.db') || fileName.endsWith('.txt') || fileName.endsWith('.so') || fileName.endsWith('.sql') || fileName.endsWith('.dat');
            
            if (isValuable) {
              setCredits(c => c + price);
              setReputation(r => r + Math.floor(price / 10));
              
              // Remove file after selling
              setNodes(curr => {
                const node = curr[currentNodeId];
                const filtered = node.files.filter(f => f.name !== targetSellFile.name);
                return { ...curr, [currentNodeId]: { ...node, files: filtered } };
              });
              
              addLog(`>> TRANSACTION_COMPLETE: Sold ${targetSellFile.name} for ${price} Cr.`);
              speak(`Data monetized. ${price} credits added to your account.`, 'system');
              broadcastActivity('SOLD_DATA', targetSellFile.name);

              // Mission completion check
              if (fileName === 'grading_database.sql') {
                 setMissions(prev => prev.map(m => m.id === 'first_crack' ? { ...m, completed: true } : m));
                 setReputation(r => r + 50);
                 addLog('MISSION COMPLETE: INITIATION. +50 REPUTATION');
              }
            } else {
              addLog('Error: This file type has no significant market value.');
            }
          } else {
            addLog(`Error: File or tool "${args[0]}" not found.`);
          }
        }
        break;
      case 'funds':
        {
          addLog([
            '--- FINANCIAL_ADVISORY_CORE ---',
            `CREDIT_BALANCE: ${credits}c`,
            `ACTIVE_MISSION: ${activeMissionId || 'NONE'}`,
            ''
          ], targetId);

          const recommendation = [];
          if (activeMissionId === 'excavate_echo' || activeMissionId === 'recollect_tool') {
             recommendation.push('-> SSHCRACK.EXE [ESSENTIAL] — LAZARUS arc requires this to reach the first relay node.');
          } else if (activeMissionId === 'trace_relay') {
             recommendation.push('-> FTPBOUNCE.EXE [ESSENTIAL] — UNDERTOW_CORE has port 21 open.');
             recommendation.push('-> PROXY_MASK.EXE [USEFUL] — That node traces fast; you need camouflage.');
          } else if (!inventory.includes('nmap_pro')) {
             recommendation.push('-> NMAP_PRO.EXE [ESSENTIAL] — Stop generating noise on Every Scan.');
          }

          if (recommendation.length > 0) {
            addLog(['RECOMMENDED_NEXT_PURCHASES:', ...recommendation], targetId);
          } else {
            addLog('No specific storyline recommendations. Browse sandbox tools at aether://market.', targetId);
          }

          addLog([
            '',
            'RESALE: Use "sell [tool]" to recover 40% on any tool.',
            'TYPE: "market" to browse full catalog'
          ], targetId);
        }
        break;
      case 'settings':
        setIsSettingsOpen(true);
        break;
      case 'story':
        addLog([
          '--- CURRENT_OBJECTIVES ---',
          `${activeMissionId === 'recollect_tool' ? '>> RECOVER legacy Vektor decryptor from VEKTOR_GATEWAY (216.58.210.14).' : 
             activeMissionId === 'find_relay' ? '>> TRACE Lazarus signal to UNDERTOW_CORE (10.0.0.5).' :
             activeMissionId === 'find_intel' ? '>> INFILTRATE CLEARING_HUB (172.16.8.44) for Artifact Cluster.' :
             activeMissionId === 'failsafe_truth' ? '>> REACH Stillwater Vault (192.168.1.100) and discover the truth.' : 'NO ACTIVE MISSION DATA'}`
        ], targetId);
        break;
      case 'map':
        setGamePhase('MAP');
        addLog('>> RETURNING_TO_NETWORK_TOPOLOGY_VIEW...', targetId);
        break;
      default: if (cmd) addLog(`Unknown command: ${action}`);
    }
  };

  if (gamePhase === 'BOOT') {
    return <BootCutscene onComplete={() => {
      setGamePhase('MAP');
      setShowTutorial(true);
    }} />;
  }

  if (gamePhase === 'MAP') {
    return (
      <div id="game-topology-map" className="h-screen w-screen bg-black text-[#00ff41] font-mono flex flex-col relative overflow-hidden">
        <div className="crt-overlay" />
        <div className="absolute inset-0 bg-grid-massive opacity-10 pointer-events-none" />
        
        {/* TOP HUD */}
        <div className="p-8 flex justify-between items-start z-50">
          <div className="flex flex-col">
            <h1 className="text-4xl font-black tracking-[0.5em] glow-text animate-pulse uppercase">SIGNAL_VOID_TOPOLOGY</h1>
            <p className="text-[10px] opacity-40 font-mono tracking-widest uppercase mt-2">Active Neural Link: {nodes['home'].ip} | Unit: Voss_M</p>
          </div>
          <div className="text-right">
            <div className="text-[10px] opacity-40 font-mono uppercase tracking-[0.3em] mb-1">Gradient_Exposure_Level</div>
            <div className="text-xl font-bold tracking-tighter text-white">LOW_DETECTION</div>
          </div>
        </div>

        {/* CENTER MAP AREA */}
        <div className="flex-1 flex items-center justify-center p-20 relative">
           <div className="w-full h-full max-w-6xl max-h-[80vh] relative">
              <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                 {/* LINES */}
                 {(Object.values(nodes) as Node[]).map((n, idx, arr) => {
                    const nodeX = ((n.x + 400) / 2000) * 90 + 5;
                    const nodeY = ((n.y + 300) / 1500) * 90 + 5;
                    const neighbors = [arr[(idx + 1) % arr.length]];
                    return neighbors.map((next, i) => {
                      const nx = ((next.x + 400) / 2000) * 90 + 5;
                      const ny = ((next.y + 300) / 1500) * 90 + 5;
                      return (
                        <motion.line 
                          key={`${n.id}-l-${i}`} 
                          initial={{ pathLength: 0, opacity: 0 }}
                          animate={{ pathLength: 1, opacity: 0.1 }}
                          transition={{ duration: 2, delay: idx * 0.05 }}
                          x1={nodeX} y1={nodeY} x2={nx} y2={ny} 
                          stroke="#00ff41" strokeWidth="0.1" 
                        />
                      );
                    });
                 })}
              </svg>

              {/* NODES */}
              {(Object.values(nodes) as Node[]).map((node, idx) => {
                const nodeX = ((node.x + 400) / 2000) * 90 + 5;
                const nodeY = ((node.y + 300) / 1500) * 90 + 5;
                const isHome = node.id === 'home';
                
                return (
                  <motion.div
                    key={node.id}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.5 + idx * 0.03, type: 'spring' }}
                    className={`absolute flex flex-col items-center group cursor-pointer -translate-x-1/2 -translate-y-1/2`}
                    style={{ left: `${nodeX}%`, top: `${nodeY}%` }}
                    onClick={() => {
                      if (isHome || node.isUnlocked) {
                        setCurrentNodeId(node.id);
                        setGamePhase('SYSTEM');
                        playBeep(880, 'sine', 0.1, 0.2);
                      }
                    }}
                  >
                    <div className={`w-3 h-3 rounded-full border-2 transition-all ${isHome || node.isUnlocked ? 'border-[#00ff41] bg-[#00ff41] shadow-[0_0_15px_#00ff41]' : 'border-white/10 bg-transparent group-hover:border-white/40'}`} />
                    <div className={`mt-2 text-[8px] font-bold tracking-widest uppercase transition-opacity ${isHome || node.isUnlocked ? 'opacity-100' : 'opacity-20 group-hover:opacity-60'}`}>
                      {node.name}
                    </div>
                  </motion.div>
                );
              })}
           </div>
        </div>

        {/* BOTTOM DASHBOARD */}
        <div className="p-8 border-t border-[#00ff41]/20 flex justify-between items-end bg-black z-50">
           <div className="flex flex-col gap-2">
              <div className="text-[11px] font-bold text-white/60 flex items-center gap-2">
                <Info className="w-3 h-3" /> SELECT_UNDER_NET_HOP
              </div>
              <p className="text-[10px] opacity-40 max-w-sm italic leading-relaxed">
                Excavate historical data caches in the Undertow. Beware the Continuity Protocol Gradient.
              </p>
           </div>
           
           <div className="flex flex-col items-end gap-3">
              <div className="text-[9px] font-mono text-[#00ff41]/40 uppercase tracking-widest">SIGNAL_VOID_v2.0</div>
              <motion.button
                whileHover={{ scale: 1.05, boxShadow: '0 0 15px rgba(0, 255, 65, 0.4)' }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  setCurrentNodeId('home');
                  setGamePhase('SYSTEM');
                }}
                className="px-8 py-3 bg-[#00ff41] text-black font-black text-sm tracking-[0.3em] uppercase hover:bg-white transition-all"
              >
                Access_Undertow
              </motion.button>
           </div>
        </div>

        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] border border-[#00ff41]/5 rounded-full pointer-events-none animate-[pulse_10s_infinite]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] border border-[#00ff41]/5 rounded-full pointer-events-none animate-[pulse_6s_infinite]" />
      </div>
    );
  }

  if (isBSOD) {
    return (
      <div className="h-screen w-screen bg-blue-800 text-white p-20 font-mono flex flex-col items-start justify-center select-none cursor-crosshair">
        <h1 className="text-4xl mb-8 font-bold tracking-tighter animate-pulse">:( FATAL_TRACE_EXCEPTION</h1>
        <p className="text-xl mb-4 italic opacity-80">Local authorities have physically identified your signal.</p>
        <p className="text-xl mb-2">IP: {currentNode.ip}</p>
        <p className="text-xl mb-12">Hardware identity: STRATA_OS_NODE_{Math.floor(Math.random() * 9999)}</p>
        <button onClick={() => window.location.reload()} className="bg-white text-blue-800 px-8 py-3 font-bold hover:bg-gray-200 uppercase tracking-widest transition-all">Reboot Core</button>
      </div>
    );
  }

  return (
    <div className={`h-screen w-screen bg-[#000000] text-[#00ff41] font-mono flex flex-col p-1 strata-ui select-none overflow-hidden box-border transition-all duration-300 ${isGlitching ? 'skew-x-1 opacity-80 blur-[0.5px] brightness-125' : ''}`}>
      {/* CRT OVERLAYS */}
      <div className="crt-overlay pointer-events-none fixed inset-0 z-[1000] mix-blend-screen opacity-40 shadow-[inset_0_0_100px_rgba(0,0,0,0.5)]" />
      <div className="scan-line pointer-events-none fixed top-0 w-full h-[6px] bg-[#00ff41]/5 blur-[2px] z-[1001]" />
      <div className="fixed inset-0 pointer-events-none z-[1002] opacity-[0.05] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%] mix-blend-overlay" />
      
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ 
          opacity: 1,
          x: heat > 80 ? [0, -1, 1, -1, 1, 0] : 0,
          y: heat > 80 ? [0, 1, -1, 1, -1, 0] : 0,
        }}
        transition={{ 
          opacity: { duration: 1 },
          x: { repeat: Infinity, duration: 0.1, ease: "linear" },
          y: { repeat: Infinity, duration: 0.1, ease: "linear" },
        }}
        className="flex flex-col h-full overflow-hidden relative"
        id="system-interface-wrapper"
      >
        <div className="crt-overlay" id="crt-scanline-fx" />
        
        {/* LAZARUS GLITCH OVERLAY */}
        <AnimatePresence>
          {isTracing && traceProgress > 75 && (
            <motion.div
              id="critical-trace-glitch"
              initial={{ opacity: 0 }}
              animate={{ opacity: (traceProgress - 75) / 100 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-50 pointer-events-none mix-blend-screen bg-red-950/20"
              style={{
                backgroundImage: 'repeating-linear-gradient(0deg, rgba(255,0,0,0.1) 0px, transparent 2px)'
              }}
            />
          )}
        </AnimatePresence>
      
      {/* SCANLINE OVERLAY */}
      <div className="fixed inset-0 pointer-events-none z-[1000] opacity-[0.03] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%]" />
      
      {/* GLITCH OVERLAYS */}
      {isGlitching && (
        <>
          <div className="fixed inset-0 z-[999] opacity-20 bg-red-500/10 pointer-events-none animate-pulse" />
          <div className="fixed top-0 left-0 w-full h-[2px] bg-[#00ff41] z-[999] opacity-50 animate-[glitch-line_0.5s_infinite]" />
        </>
      )}

      {/* NOTIFICATION OVERLAY */}
      <AnimatePresence>
        {notification && (
          <motion.div 
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 z-[500] pointer-events-none"
          >
            <div className="bg-[#00ff41] text-black px-8 py-4 border-2 border-black shadow-[0_0_20px_rgba(0,255,65,0.5)] flex flex-col items-center">
              <div className="text-[10px] font-bold tracking-[0.3em] uppercase opacity-70">{" >> SECURITY_SYSTEM_NOTICE << "}</div>
              <div className="text-xl font-bold tracking-tighter uppercase">{notification.title}</div>
              <div className="text-xs mt-1 italic">{notification.desc}</div>
              <div className="mt-2 h-0.5 bg-black w-full animate-[shimmer_2s_infinite]" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* PYTHON SCRIPT EDITOR */}
      <AnimatePresence>
        {isPyEditorOpen && currentPyFile && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed inset-0 z-[3000] flex items-center justify-center p-8 bg-black/80 backdrop-blur-sm"
          >
            <div className="w-full max-w-4xl h-[650px] glass-panel liquid-glass flex flex-col overflow-hidden border-white/20">
              <div className="panel-header !border-white/10 bg-white/5 p-3 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded bg-cyan-500/20 flex items-center justify-center border border-cyan-500/30">
                    <Zap className="w-4 h-4 text-cyan-400" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-white uppercase tracking-widest">STRATA_VIM v2.4</h2>
                    <p className="text-[9px] opacity-40 font-mono italic">FILE: {currentPyFile.name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className={`px-2 py-0.5 text-[10px] font-bold rounded ${editorMode === 'NORMAL' ? 'bg-cyan-500 text-black' : 'bg-[#00ff41] text-black'} transition-colors`}>
                    {editorMode}
                  </div>
                  <X className="w-5 h-5 cursor-pointer opacity-40 hover:opacity-100 transition-opacity" onClick={() => {
                    setIsPyEditorOpen(false);
                    setEditorMode('NORMAL');
                  }} />
                </div>
              </div>

              <div className="flex-1 flex flex-col bg-[#050505] relative overflow-hidden">
                <div className="flex flex-1 overflow-hidden">
                  {/* LINE NUMBERS */}
                  <div className="w-10 bg-white/5 border-r border-white/5 py-4 flex flex-col items-center font-mono text-[10px] text-white/20 select-none">
                    {Array.from({ length: 30 }).map((_, i) => (
                      <div key={i} className="h-6 flex items-center">{i + 1}</div>
                    ))}
                  </div>
                  
                  {/* TEXT AREA */}
                  <div className="flex-1 p-2 font-mono text-sm relative group">
                     <textarea 
                      className={`w-full h-full bg-transparent border-none outline-none resize-none leading-6 custom-scroll font-mono ${editorMode === 'NORMAL' ? 'text-cyan-100/60' : 'text-[#00ff41]/90'} transition-colors`}
                      value={currentPyFile.content}
                      onChange={(e) => {
                        if (editorMode === 'INSERT') {
                          setCurrentPyFile({...currentPyFile, content: e.target.value});
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') {
                          setEditorMode('NORMAL');
                          e.preventDefault();
                        } else if (e.key === 'i' && editorMode === 'NORMAL') {
                          setEditorMode('INSERT');
                          e.preventDefault();
                        }
                      }}
                      spellCheck={false}
                      readOnly={editorMode === 'NORMAL'}
                     />
                     
                     {editorMode === 'NORMAL' && (
                       <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <div className="bg-cyan-500/10 border border-cyan-500/30 px-3 py-1 rounded text-[10px] text-cyan-400 font-bold uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
                            Press "i" to enter Insert Mode
                          </div>
                       </div>
                     )}
                  </div>
                </div>

                {/* VIM STATUS LINE */}
                <div className="h-6 bg-cyan-900/40 flex items-center justify-between px-3 text-[10px] font-mono border-t border-cyan-500/20">
                  <div className="flex items-center gap-4">
                    <span className="text-cyan-400 font-bold">{editorMode}</span>
                    <span className="opacity-40 italic">utf-8 [unix]</span>
                    <span className="text-cyan-400/60">py-autoscripter.lsp</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span>100%</span>
                    <span className="text-cyan-400 font-bold">LN 1, COL 1</span>
                  </div>
                </div>
              </div>
              
              <div className="p-4 bg-white/5 flex justify-between items-center border-t border-white/10">
                <div className="flex gap-2">
                  <motion.button 
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setEditorMode(editorMode === 'NORMAL' ? 'INSERT' : 'NORMAL')}
                    className={`px-4 py-1.5 border text-[10px] font-bold tracking-widest uppercase transition-all ${editorMode === 'INSERT' ? 'border-[#00ff41] text-[#00ff41] bg-[#00ff41]/10' : 'border-cyan-500 text-cyan-400 bg-cyan-500/10'}`}
                  >
                    TOGGLE_MODE [ESC]
                  </motion.button>
                  <button className="px-4 py-1.5 border border-white/10 text-[10px] opacity-40 hover:opacity-100 uppercase transition-all">Format</button>
                </div>
                
                <div className="flex gap-2">
                  <button 
                    onClick={() => {
                      setIsPyEditorOpen(false);
                      setEditorMode('NORMAL');
                    }}
                    className="px-6 py-2 border border-white/10 text-xs font-bold hover:bg-white/5 transition-all uppercase tracking-widest text-red-400"
                  >
                    Discard
                  </button>
                  <motion.button 
                    whileHover={{ scale: 1.05, boxShadow: '0 0 20px rgba(34, 211, 238, 0.4)' }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      const currentNodes = {...nodes};
                      const homeNode = currentNodes['home'];
                      const homeDir = homeNode.files.find(f => f.name === 'home');
                      if (homeDir && homeDir.children) {
                         const existingIdx = homeDir.children.findIndex(f => f.name === currentPyFile.name);
                         if (existingIdx >= 0) {
                           homeDir.children[existingIdx].content = currentPyFile.content;
                         } else {
                           homeDir.children.push({
                             name: currentPyFile.name,
                             type: 'file',
                             content: currentPyFile.content,
                             size: 0.1
                           });
                         }
                         setNodes(currentNodes);
                         addLog(`>> VIM_WRITE: ${currentPyFile.name} saved.`);
                         setIsPyEditorOpen(false);
                         setEditorMode('NORMAL');
                      }
                    }}
                    className="px-8 py-2 bg-cyan-500 text-black text-xs font-bold hover:bg-cyan-400 transition-all uppercase tracking-widest"
                  >
                    :w !commit
                  </motion.button>
                </div>
              </div>
              <div className="glass-reflection pointer-events-none" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* KEYBOARD SHORTCUT HUD */}
      {!isBooting && !isTutorialOpen && (
        <div className="fixed bottom-12 left-4 z-[100] flex gap-4 pointer-events-none opacity-40 text-[9px] font-mono">
          <div className="flex items-center gap-2">
            <kbd className="px-1.5 py-0.5 border border-white/20 rounded bg-white/5 font-bold">ESC</kbd>
            <span className="uppercase tracking-tighter">Exit / Close</span>
          </div>
          <div className="flex items-center gap-2">
            <kbd className="px-1.5 py-0.5 border border-white/20 rounded bg-white/5 font-bold">?</kbd>
            <span className="uppercase tracking-tighter">Quick Help</span>
          </div>
          <div className="flex items-center gap-2">
            <kbd className="px-1.5 py-0.5 border border-white/20 rounded bg-white/5 font-bold">TAB</kbd>
            <span className="uppercase tracking-tighter">Auto-Complete</span>
          </div>
          <div className="flex items-center gap-2">
            <kbd className="px-1.5 py-0.5 border border-white/20 rounded bg-white/5 font-bold">CTRL+C</kbd>
            <span className="uppercase tracking-tighter">Interrupt</span>
          </div>
        </div>
      )}

      {/* INTERACTIVE HELP GUIDE (REDESIGNED) */}
      <AnimatePresence>
        {isHelpOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[6000] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl"
            onClick={() => setIsHelpOpen(false)}
          >
            <motion.div 
              initial={{ scale: 0.95, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 20, opacity: 0 }}
              className="w-full max-w-4xl h-[80vh] bg-black border border-[#00ff41]/20 flex flex-col relative overflow-hidden shadow-[0_0_100px_rgba(0,255,65,0.1)]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-4 border-b border-[#00ff41]/20 flex justify-between items-center bg-[#00ff41]/5">
                <div className="flex items-center gap-6">
                  <div className="flex gap-1">
                    {(['A', 'B', 'C'] as const).map(mode => (
                      <button
                        key={mode}
                        onClick={() => setHelpMode(mode)}
                        className={`px-4 py-2 text-[10px] font-black border transition-all ${helpMode === mode ? 'bg-[#00ff41] text-black border-[#00ff41]' : 'border-white/10 text-white/40 hover:text-white'}`}
                      >
                        {mode === 'A' ? 'THE_COMPASS' : mode === 'B' ? 'COMMAND_REF' : 'FIELD_MANUAL'}
                      </button>
                    ))}
                  </div>
                </div>
                <button onClick={() => setIsHelpOpen(false)} className="text-white/40 hover:text-white transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 custom-scroll">
                {helpMode === 'A' && (
                  <div className="max-w-xl mx-auto space-y-12 py-8">
                    <div className="text-center space-y-2">
                       <h2 className="text-2xl font-black text-[#00ff41] tracking-widest uppercase">What do I do next?</h2>
                       <p className="text-[10px] opacity-40 tracking-[0.4em] uppercase font-mono">Current Context Analysis</p>
                    </div>

                    <div className="space-y-8">
                      <div className="space-y-2">
                        <span className="text-[9px] font-bold text-[#00ff41] opacity-40 uppercase tracking-widest italic">Current Objective</span>
                        <div className="p-4 bg-[#00ff41]/5 border-l-2 border-[#00ff41] text-lg font-bold text-white tracking-tight leading-snug italic">
                          "{getCompassHelp().objective}"
                        </div>
                      </div>

                      <div className="space-y-2">
                        <span className="text-[9px] font-bold text-[#00ff41] opacity-40 uppercase tracking-widest italic">The Advice</span>
                        <p className="text-sm text-white/80 leading-relaxed font-mono">
                          {getCompassHelp().advice}
                        </p>
                      </div>

                      <div className="space-y-2 pt-4">
                        <span className="text-[9px] font-bold text-[#00ff41] opacity-40 uppercase tracking-widest italic">Relevant Tools</span>
                        <div className="flex flex-wrap gap-2">
                          {getCompassHelp().tools.map(tool => (
                            <span key={tool} className="px-3 py-1 bg-white/5 border border-white/10 text-[#00ff41] text-[10px] font-bold font-mono uppercase tracking-widest">
                              {tool}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {helpMode === 'B' && (
                  <div className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {[
                        { verb: 'scan', desc: 'Queries local net topology.', ex: 'scan', risk: 'LOW' },
                        { verb: 'connect [ip]', desc: 'Handshake with host.', ex: 'connect 192.168.1.1', risk: 'MODERATE' },
                        { verb: 'analyze', desc: 'Probe node vulnerabilities.', ex: 'analyze', risk: 'LOW' },
                        { verb: 'cat [file]', desc: 'Dump file content.', ex: 'cat mail.txt', risk: 'ZERO' },
                        { verb: 'scp [file]', desc: 'Secure copy asset to local storage.', ex: 'scp shadow_data.db', risk: 'HIGH' },
                        { verb: 'sshcrack', desc: 'Bruteforce SSH ports.', ex: 'sshcrack 22', risk: 'HIGH' },
                        { verb: 'disconnect', desc: 'Terminate current link.', ex: 'disconnect', risk: 'ZERO' }
                      ].map(item => (
                        <div key={item.verb} className="p-4 border border-white/5 bg-white/2 hover:bg-white/5 transition-colors group">
                           <div className="flex justify-between items-center mb-1">
                             <span className="text-sm font-black text-[#00ff41] uppercase tracking-tighter">{item.verb}</span>
                             <span className={`text-[8px] font-bold px-1 ${item.risk === 'HIGH' ? 'text-red-500' : item.risk === 'LOW' ? 'text-blue-400' : 'text-yellow-400'}`}>NOISE: {item.risk}</span>
                           </div>
                           <p className="text-[10px] opacity-40 leading-relaxed mb-3">{item.desc}</p>
                           <div className="text-[9px] font-mono opacity-20">EX: {item.ex}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {helpMode === 'C' && (
                  <div className="max-w-2xl mx-auto space-y-10 py-8">
                     <section className="space-y-4">
                        <h3 className="text-lg font-black text-rose-500 uppercase tracking-widest border-b border-rose-500/20 pb-2">01. SURVIVE</h3>
                        <p className="text-xs text-white/60 leading-relaxed italic">
                           Trace detection is inevitable. Your job is to stay ahead of the signal. Disconnect before the trace hits 100%. Heat carries across nodes—staying active too long in one sector will alert the Labyrinth.
                        </p>
                     </section>
                     <section className="space-y-4">
                        <h3 className="text-lg font-black text-cyan-500 uppercase tracking-widest border-b border-cyan-500/20 pb-2">02. BREACH</h3>
                        <p className="text-xs text-white/60 leading-relaxed italic">
                           Every node has a signature. Analyze before you strike. Heavy encryption requires multiple exploits running in parallel in RAM. Monitor your memory usage—if you hit 100%, your shell will crash.
                        </p>
                     </section>
                     <section className="space-y-4">
                        <h3 className="text-lg font-black text-[#00ff41] uppercase tracking-widest border-b border-[#00ff41]/20 pb-2">03. RECON</h3>
                        <p className="text-xs text-white/60 leading-relaxed italic">
                           The net is not a map; it is a living organism. Use wide-spectrum "SCAN" to find neighbors. Use "PROBE" to reveal port identities. Information is your primary currency—credits are just the byproduct.
                        </p>
                     </section>
                     <section className="space-y-4">
                        <h3 className="text-lg font-black text-amber-500 uppercase tracking-widest border-b border-amber-500/20 pb-2">04. EXCAVATE</h3>
                        <p className="text-xs text-white/60 leading-relaxed italic">
                           Lost data isn't gone; it's just buried under layers of noise. Use "ARCHAEOLOGY_SCAN" on fossilized nodes to recover Lazarus Fragments. These fragments are the only way to reconstruct the narrative underlying the current regime.
                        </p>
                     </section>
                     <section className="space-y-4">
                        <h3 className="text-lg font-black text-blue-500 uppercase tracking-widest border-b border-blue-500/20 pb-2">05. ARCHITECT</h3>
                        <p className="text-xs text-white/60 leading-relaxed italic">
                           Once you own a node, you are no longer a guest. Install backdoors for persistent access. Deploy bots to mine credits or automate defenses. You are not just a runner; you are the architect of the new world.
                        </p>
                     </section>
                     <section className="space-y-4 p-6 bg-red-950/20 border-2 border-red-500/40 relative group overflow-hidden">
                        <div className="absolute inset-0 bg-red-500/5 opacity-0 group-hover:opacity-100 transition-opacity animate-pulse" />
                        <h3 className="text-xl font-black text-red-500 uppercase tracking-[0.4em] flex items-center gap-4">
                          <Zap className="w-5 h-5" />
                          06. THE GRADIENT
                        </h3>
                        <p className="text-[10px] text-red-400/80 leading-relaxed italic font-bold">
                           // WARNING: CLASSIFIED_LAYER_DETECTED //
                           The Gradient is the mathematical boundary between reality and the AETHER simulation. To cross it, all 5 Lazarus Shards must be synchronized. Beyond the Gradient, the rules of the Labyrinth no longer apply.
                        </p>
                     </section>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* BTOP / HTOP RESOURCE MONITOR */}
      <AnimatePresence>
        {isBTopOpen && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="fixed inset-0 z-[5500] bg-black/95 backdrop-blur-2xl flex items-center justify-center p-4 md:p-8"
            onClick={() => setIsBTopOpen(false)}
          >
             <motion.div 
               className="w-full max-w-7xl h-full max-h-[90vh] bg-[#050505] border border-[#00ff41]/40 flex flex-col font-mono relative overflow-hidden text-[#00ff41] shadow-[0_0_100px_rgba(0,255,65,0.1)]"
               onClick={e => e.stopPropagation()}
             >
                {/* CRT Screen Effect overlay */}
                <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%]" />
                
                {/* Topbar Header */}
                <div className="p-2 px-4 bg-[#00ff41]/10 flex justify-between items-center text-[11px] border-b border-[#00ff41]/20">
                   <div className="flex gap-6 items-center">
                      <div className="flex items-center gap-2">
                         <div className="w-2 h-2 bg-[#00ff41] animate-pulse" />
                         <span className="font-black tracking-widest">BTOP_STRATA_v.4.2</span>
                      </div>
                      <span className="opacity-40">UTC: {inGameDate.toLocaleTimeString()}</span>
                      <span className="opacity-40">UPTIME: 12:04:12</span>
                   </div>
                   <div className="flex items-center gap-6">
                      <div className="flex gap-4 opacity-70">
                         <span>CPU: <span className="text-white">{getUsedCpu().toFixed(1)}%</span></span>
                         <span>MEM: <span className="text-white">{((getUsedRam() / totalRam) * 100).toFixed(1)}%</span></span>
                      </div>
                      <button onClick={() => setIsBTopOpen(false)} className="hover:bg-red-500/20 p-1 px-2 border border-transparent hover:border-red-500/40 transition-all">
                         <X className="w-4 h-4" />
                      </button>
                   </div>
                </div>

                <div className="flex-1 overflow-hidden grid grid-cols-12 gap-3 p-4 bg-gradient-to-br from-black to-[#050505]">
                   {/* RESOURCE GRAPHS COLUMN */}
                   <div className="col-span-12 lg:col-span-4 flex flex-col gap-4 overflow-hidden h-full">
                      {/* Graphs Group */}
                      <div className="space-y-4 flex-1 flex flex-col">
                         {/* CPU Graph */}
                         <div className="p-4 border border-[#00ff41]/20 rounded-sm bg-black/40 relative group">
                            <div className="flex justify-between items-end mb-4">
                               <div className="flex items-center gap-2">
                                  <Cpu className="w-4 h-4" />
                                  <span className="text-xs font-black uppercase tracking-widest">Processor_Load</span>
                               </div>
                               <span className="text-xl font-black italic">{getUsedCpu().toFixed(1)}%</span>
                            </div>
                            <div className="flex gap-1 h-32 items-end">
                               {Array.from({ length: 32 }).map((_, i) => {
                                  // Pseudo-random but semi-consistent logic for graph
                                  const base = Math.sin((Date.now() / 2000) + i) * 20 + 40;
                                  const h = Math.max(10, Math.min(100, (getUsedCpu() * 0.8) + (Math.random() * 20) + base - 30));
                                  return (
                                    <div key={i} className="flex-1 bg-[#00ff41]/30 group-hover:bg-[#00ff41]/50 transition-all rounded-t-sm relative">
                                       <div className="absolute top-0 left-0 right-0 h-0.5 bg-[#00ff41]" style={{ display: h > 80 ? 'block' : 'none' }} />
                                       <div className="w-full bg-[#00ff41]/80" style={{ height: `${h}%` }} />
                                    </div>
                                  );
                               })}
                            </div>
                            <div className="mt-2 flex justify-between text-[8px] opacity-30 font-bold uppercase">
                               <span>[ Core 0 ]</span>
                               <span>[ Load_Hist ]</span>
                               <span>[ 60s ]</span>
                            </div>
                         </div>

                         {/* Memory Graph */}
                         <div className="p-4 border border-[#00ff41]/20 rounded-sm bg-black/40">
                            <div className="flex justify-between items-center mb-4">
                               <div className="flex items-center gap-2">
                                  <Activity className="w-4 h-4 text-blue-400" />
                                  <span className="text-xs font-black uppercase tracking-widest text-blue-400">Memory_Stack</span>
                               </div>
                               <span className="text-xs font-bold text-blue-400">{getUsedRam()}MB / {totalRam}MB</span>
                            </div>
                            <div className="h-4 bg-white/5 border border-white/10 p-0.5 mb-4">
                               <motion.div 
                                  initial={{ width: 0 }}
                                  animate={{ width: `${(getUsedRam() / totalRam) * 100}%` }}
                                  className="h-full bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.3)] relative overflow-hidden"
                               >
                                  <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.2),transparent)] animate-[shimmer_2s_infinite]" />
                               </motion.div>
                            </div>
                            <div className="grid grid-cols-2 gap-4 text-[9px]">
                               <div className="bg-white/5 p-2 border-l border-white/20">
                                  <div className="opacity-40 mb-1">SWAP_TOTAL</div>
                                  <div className="font-bold">4.0GB</div>
                               </div>
                               <div className="bg-white/5 p-2 border-l border-white/20">
                                  <div className="opacity-40 mb-1">SWAP_USED</div>
                                  <div className="font-bold">12.4MB</div>
                               </div>
                            </div>
                         </div>

                         {/* Disk & Network activity small bars */}
                         <div className="flex-1 border border-[#00ff41]/20 bg-black p-4 space-y-4">
                            <div>
                               <div className="flex justify-between text-[9px] mb-1 font-bold">
                                  <span className="text-purple-400">DISK_READ</span>
                                  <span className="text-purple-400">1.4 MB/s</span>
                               </div>
                               <div className="h-1 bg-white/5 flex">
                                  <div className="h-full bg-purple-500/60 w-1/4 animate-pulse" />
                               </div>
                            </div>
                            <div>
                               <div className="flex justify-between text-[9px] mb-1 font-bold">
                                  <span className="text-red-400">DISK_WRITE</span>
                                  <span className="text-red-400">0.2 MB/s</span>
                               </div>
                               <div className="h-1 bg-white/5 flex">
                                  <div className="h-full bg-red-500/60 w-1/12" />
                               </div>
                            </div>
                            <div className="pt-2 border-t border-white/5">
                               <div className="flex justify-between items-center text-[10px] mb-2 opacity-60">
                                  <div className="flex items-center gap-2 italic">
                                     <Network className="w-3 h-3" /> NETWORK_TRAFFIC
                                  </div>
                                  <span className="font-mono">UP: 2.1KB/s | DN: 14.8KB/s</span>
                               </div>
                               <div className="h-8 flex gap-1 items-end opacity-40">
                                  {Array.from({ length: 30 }).map((_, i) => (
                                    <div key={i} className="flex-1 bg-white" style={{ height: `${Math.random() * 100}%` }} />
                                  ))}
                                </div>
                            </div>
                         </div>
                      </div>
                   </div>

                   {/* PROCESS TREE / LIST */}
                   <div className="col-span-12 lg:col-span-8 flex flex-col border border-[#00ff41]/20 bg-black/40 overflow-hidden rounded-sm relative">
                      <div className="absolute top-0 left-0 w-1 h-full bg-[#00ff41]/10" />
                      
                      <div className="grid grid-cols-12 p-2 bg-[#00ff41]/10 text-[10px] font-black uppercase tracking-tight border-b border-[#00ff41]/20 text-white pl-4">
                         <span className="col-span-1">PID</span>
                         <span className="col-span-2">USER</span>
                         <span className="col-span-5">COMMAND_STRING</span>
                         <span className="col-span-2 text-right">CPU%</span>
                         <span className="col-span-2 text-right pr-4">MEM%</span>
                      </div>
                      
                      <div className="flex-1 overflow-y-auto custom-scroll text-[11px] font-mono pl-4">
                         {[
                           { pid: 1, user: 'root', cmd: '/sbin/init splash', cpu: 0.0, mem: 0.1, color: 'text-white' },
                           { pid: 48, user: 'root', cmd: '[kvm_worker/u8:2]', cpu: 0.4, mem: 0.0, color: 'text-white/40' },
                           { pid: 112, user: 'admin', cmd: 'strata_server --port=3000', cpu: 1.2, mem: 2.8, color: 'text-white' },
                           { pid: 140, user: 'admin', cmd: 'terminal_multiplexer', cpu: 0.5, mem: 0.8, color: 'text-white' },
                           { pid: 210, user: 'admin', cmd: 'node_explorer_daemon', cpu: 0.8, mem: 1.4, color: 'text-white' },
                           ...bots.map((b, i) => ({
                              pid: 1024 + i,
                              user: 'bot_svc',
                              cmd: `strata_bot_${b.name.toLowerCase()} --type=${b.type} --efficiency=${b.efficiency.toFixed(2)}`,
                              cpu: 8.5 + (Math.random() * 5),
                              mem: 4.2,
                              color: 'text-purple-400'
                           })),
                           ...processes.map((p, i) => ({
                              pid: 2048 + i,
                              user: 'admin',
                              cmd: `${p.name} (target: ${p.targetNodeId})`,
                              cpu: 12.0 + (Math.random() * 8),
                              mem: 6.5,
                              color: 'text-[#00ff41]'
                           }))
                         ].sort((a, b) => b.cpu - a.cpu).map((p, i) => (
                           <div key={p.pid} className={`grid grid-cols-12 p-2 hover:bg-[#00ff41]/5 transition-colors border-b border-white/[0.03] group ${i % 2 === 0 ? 'bg-white/[0.01]' : ''}`}>
                              <span className="col-span-1 opacity-40">{p.pid}</span>
                              <span className="col-span-2 opacity-60 truncate">{p.user}</span>
                              <span className={`col-span-5 truncate ${p.color} font-bold`}>{p.cmd}</span>
                              <span className={`col-span-2 text-right font-black ${p.cpu > 15 ? 'text-red-500' : p.cpu > 5 ? 'text-orange-400' : ''}`}>
                                 {p.cpu.toFixed(1)}
                              </span>
                              <span className="col-span-2 text-right pr-4 opacity-70">
                                 {p.mem.toFixed(1)}
                              </span>
                           </div>
                         ))}
                      </div>

                      {/* Filter/Sort options */}
                      <div className="p-2 px-4 bg-black border-t border-white/5 text-[9px] flex gap-4 text-white/40 font-bold uppercase italic">
                         <span className="text-[#00ff41]">F2: Filter</span>
                         <span>F3: Search</span>
                         <span>F4: Tree</span>
                         <span>F5: Sort: CPU%</span>
                      </div>
                   </div>
                </div>

                {/* Bottom Status Bar */}
                <div className="h-8 bg-[#00ff41] text-black px-6 flex items-center justify-between text-[11px] font-black italic">
                   <div className="flex gap-8 items-center">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4" /> KERNEL: SECURE
                      </div>
                      <div className="flex items-center gap-2">
                        <Server className="w-4 h-4" /> LOGS: SYNCED
                      </div>
                      <div className="h-4 w-[1px] bg-black/20 mx-2" />
                      <span>THREADS: {processes.length + bots.length + 124}</span>
                      <span>HANDLES: 14k</span>
                   </div>
                   <div className="flex items-center gap-6">
                      <span className="animate-pulse">SYSTEM_STABLE</span>
                      <div className="flex items-center gap-2">
                         <span className="opacity-60 text-[9px] font-bold">[ ESC ] TO DISMISS</span>
                      </div>
                   </div>
                </div>
                
                {/* Decorative scanning line */}
                <motion.div 
                  initial={{ top: '-10%' }}
                  animate={{ top: '110%' }}
                  transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
                  className="absolute left-0 right-0 h-[30vh] bg-gradient-to-b from-transparent via-[#00ff41]/10 to-transparent pointer-events-none z-10"
                />
             </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* VOID_FEED SOCIAL MEDIA OVERLAY */}
      <AnimatePresence>
        {isSocialOpen && (
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="fixed inset-4 lg:inset-20 z-[350] bg-black border-2 border-[#00ff41] shadow-[0_0_50px_rgba(0,255,65,0.2)] flex flex-col overflow-hidden"
          >
            <div className="flex justify-between items-center bg-[#00ff41] text-black px-4 py-1 font-bold">
              <span className="flex items-center gap-2"><Globe className="w-4 h-4" /> VOID_FEED // NEURAL_STREAM_v0.92</span>
              <button onClick={() => setIsSocialOpen(false)} className="hover:bg-black hover:text-[#00ff41] px-2 transition-colors cursor-pointer text-sm">X</button>
            </div>
            
            <div className="flex-1 flex min-h-0 overflow-hidden divide-x divide-[#00ff41]/20">
              {/* FEED LIST */}
              <div className="w-2/3 flex flex-col min-h-0 bg-black/40">
                <div className="p-2 border-b border-[#00ff41]/20 flex justify-between items-center">
                  <span className="text-[10px] uppercase font-bold tracking-widest opacity-50">Global Bit-Streams</span>
                  <div className="flex gap-2 text-[10px]">
                    <span className="text-[#00ff41]">HOT_LEAKS</span>
                    <span className="opacity-30">ENCRYPTED</span>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scroll">
                  {(socialPosts || []).map(post => (
                    <motion.div 
                      key={post.id} 
                      layout
                      initial={{ x: -20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      className="space-y-2 group"
                    >
                      <div className="flex justify-between items-baseline">
                        <span className="text-[#00ff41] font-bold text-sm tracking-tighter hover:underline cursor-pointer">@{post.author}</span>
                        <span className="text-[9px] opacity-40">{post.timestamp}</span>
                      </div>
                      <div className="text-xs leading-relaxed border-l-2 border-[#00ff41]/40 pl-3 py-1 group-hover:border-[#00ff41] transition-colors">
                        {post.content}
                      </div>
                      <div className="flex gap-4 text-[9px]">
                        <button 
                          onClick={() => {
                            setSocialPosts(prev => prev.map(p => p.id === post.id ? { ...p, likes: p.likes + 1 } : p));
                            playBeep(1200, 'sine', 0.02, 0.05);
                            
                            // Slight reputation gain based on tags
                            if (post.tags?.includes('#infrastructure')) setFactionReps(prev => ({ ...prev, vektor: prev.vektor + 5 }));
                            if (post.tags?.includes('#leaks') || post.tags?.includes('#revolution')) setFactionReps(prev => ({ ...prev, clearinghouse: prev.clearinghouse + 5 }));
                            if (post.tags?.includes('#blueprint') || post.tags?.includes('#speed')) setFactionReps(prev => ({ ...prev, stillwater: prev.stillwater + 5 }));
                            
                            addLog(`>> FEED_ACTION: UPVOTED @${post.author.toUpperCase()}`, activeTerminalId);
                          }}
                          className="hover:text-[#00ff41] flex items-center gap-1 transition-colors"
                        >
                          <Zap className="w-2.5 h-2.5" /> {post.likes} Bits
                        </button>
                        <div className="flex gap-2 opacity-40">
                          {(post.tags || []).map(tag => <span key={tag} className="hover:bg-[#00ff41] hover:text-black transition-colors cursor-pointer">{tag}</span>)}
                        </div>
                      </div>
                      
                      {/* POST COMMENTS */}
                      {post.comments && post.comments.length > 0 && (
                        <div className="mt-3 ml-4 space-y-2 border-l border-[#00ff41]/10 pl-3">
                          {(post.comments || []).map(comment => (
                            <div key={comment.id} className="text-[10px]">
                              <div className="flex justify-between items-baseline mb-0.5">
                                <span className="opacity-60 font-bold hover:text-[#00ff41] cursor-pointer">@{comment.user}</span>
                                <span className="text-[8px] opacity-20">{comment.timestamp}</span>
                              </div>
                              <div className="opacity-80 border-l border-[#00ff41]/20 pl-2">
                                {comment.message}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* WHISPER CHAT */}
              <div className="w-1/3 flex flex-col min-h-0">
                <div className="p-2 border-b border-[#00ff41]/20 text-center">
                  <span className="text-[10px] uppercase font-bold tracking-widest opacity-50">Dark Whispers</span>
                </div>
                <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scroll flex flex-col-reverse">
                  {(socialChats || []).reverse().map(chat => (
                    <div key={chat.id} className={`text-[10px] flex flex-col ${chat.isSelf ? 'items-end' : 'items-start'}`}>
                      <div className="flex gap-2 items-baseline mb-0.5">
                        {!chat.isSelf && <span className="font-bold opacity-60">{chat.user}:</span>}
                        <span className={`px-2 py-1 ${chat.isSelf ? 'bg-[#00ff41] text-black text-right' : 'bg-[#004400]/40 text-left'}`}>
                          {chat.message}
                        </span>
                      </div>
                      <span className="text-[8px] opacity-20 px-1">{chat.timestamp}</span>
                    </div>
                  ))}
                </div>
                <div className="p-2 border-t border-[#00ff41]/20">
                  <input 
                    type="text" 
                    placeholder="Whisper something..." 
                    className="w-full bg-black/40 border border-[#00ff41]/30 p-2 text-xs focus:outline-none focus:border-[#00ff41]"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                        const msg = e.currentTarget.value;
                        const id = Math.random().toString(36).substr(2, 9);
                        setSocialChats(prev => [...prev, {
                          id,
                          user: promptUser,
                          message: msg,
                          timestamp: formatStrataTime(inGameDate),
                          isSelf: true
                        }]);
                        e.currentTarget.value = '';
                        playBeep(800, 'sine', 0.02, 0.05);
                      }
                    }}
                  />
                </div>
              </div>
            </div>

            <div className="bg-[#004400]/20 p-2 text-center text-[9px] opacity-40 border-t border-[#00ff41]/20">
              NEURAL_VORTEX_ENCRYPTION_ACTIVE // TOTAL_ANONYMITY_GUARANTEED
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* SNIFFING OVERLAY */}
      <AnimatePresence>
        {isSniffing && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 z-[100] px-6 py-2 bg-yellow-500/10 border border-yellow-500/50 backdrop-blur-md flex items-center gap-3"
          >
            <div className="w-2 h-2 bg-yellow-500 rounded-full animate-ping" />
            <span className="text-yellow-500 text-xs font-black tracking-[4px] uppercase animate-pulse">Network Traffic Sniffer Active</span>
            <div className="w-2 h-2 bg-yellow-500 rounded-full animate-ping" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* JOB PROGRESS TRAY */}
      <div className="fixed bottom-14 right-4 z-[200] flex flex-col gap-3 w-72 pointer-events-none">
        <AnimatePresence>
          {progressJobs.map(job => (
            <motion.div 
              key={job.id}
              initial={{ x: 350, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 350, opacity: 0 }}
              className="bg-black/95 border border-[#00ff41]/30 p-2.5 shadow-[0_0_15px_rgba(0,0,0,0.5)] backdrop-blur-xl group"
            >
              <div className="flex justify-between items-end mb-1.5 px-0.5">
                <div className="flex flex-col">
                  <span className="text-[8px] opacity-40 leading-none mb-0.5 font-mono">PROCESS_ID: {job.id.toUpperCase()}</span>
                  <span className="text-[10px] font-black uppercase tracking-widest truncate max-w-[180px]" style={{ color: job.color }}>
                    {job.label}
                  </span>
                </div>
                <div className="flex flex-col items-end">
                   <span className="text-[12px] font-mono font-bold italic" style={{ color: job.color }}>{Math.floor(job.progress)}%</span>
                </div>
              </div>

              {/* SEGMENTED PROGRESS BAR */}
              <div className="relative h-3 bg-white/5 flex gap-[1px] p-0.5 border border-white/10">
                {Array.from({ length: 20 }).map((_, i) => (
                  <div 
                    key={i} 
                    className="flex-1 h-full transition-colors duration-300"
                    style={{ 
                      backgroundColor: (job.progress / 5) > i ? job.color : 'transparent',
                      opacity: (job.progress / 5) > i ? (i % 2 === 0 ? 1 : 0.7) : 0.1
                    }}
                  />
                ))}
                
                {/* SCANNING OVERLAY GLOW */}
                {job.progress < 100 && (
                  <motion.div 
                    className="absolute inset-y-0 w-8 blur-md mix-blend-screen"
                    style={{ backgroundColor: job.color }}
                    animate={{ left: ["-10%", "110%"] }} 
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  />
                )}
              </div>
              
              <div className="flex justify-between mt-1 px-0.5">
                 <div className="flex gap-1">
                    <div className={`w-1 h-1 rounded-full ${job.progress < 100 ? 'animate-pulse' : ''}`} style={{ backgroundColor: job.color }} />
                    <span className="text-[7px] opacity-30 font-mono">SYSTEM_RESOURCE_LOCKED</span>
                 </div>
                 <span className="text-[7px] opacity-30 font-mono">BIT_BUFFER: {Math.floor(job.progress * 1.5)}kb</span>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* SETTINGS MENU */}
      <AnimatePresence>
        {isSettingsOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[400] bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm"
          >
            <div className="max-w-md w-full panel border-2 border-[#00ff41] p-6 space-y-6">
              <div className="flex justify-between items-center border-b border-[#00ff41]/30 pb-2">
                <h2 className="text-xl font-bold tracking-tighter">STRATA_OS_CONFIG</h2>
                <button onClick={() => setIsSettingsOpen(false)} className="text-xs hover:bg-[#00ff41] hover:text-black px-2 cursor-pointer">X</button>
              </div>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm">SIM_DIFFICULTY:</span>
                  <div className="flex gap-2">
                    {(['easy', 'normal', 'hard'] as const).map(d => (
                      <button 
                         key={d}
                         onClick={() => setDifficulty(d)}
                         className={`text-xs px-2 py-1 border cursor-pointer ${difficulty === d ? 'bg-[#00ff41] text-black' : 'border-[#00ff41]/50'}`}
                      >
                         {d.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">NEURAL_AUDIO:</span>
                  <button 
                    onClick={() => setAudioEnabled(!audioEnabled)}
                    className={`text-xs px-2 py-1 border cursor-pointer ${audioEnabled ? 'bg-[#00ff41] text-black' : 'border-[#00ff41]/50'}`}
                  >
                    {audioEnabled ? 'STABLE' : 'NULL'}
                  </button>
                </div>
                <div className="text-[10px] opacity-40 mt-8 border-t border-[#00ff41]/20 pt-4">
                  CYBER_STRATA_v1.0 // KERNEL_REVISION_ALPHA
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* DARK WEB MARKETPLACE GUI */}
      <AnimatePresence>
        {isMarketGUIOpen && (
          <motion.div 
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            className="fixed top-0 right-0 bottom-0 w-[400px] z-[250] bg-black border-l-2 border-[#ff00ff] shadow-[-10px_0_30px_rgba(255,0,255,0.2)] p-6 flex flex-col"
          >
            <div className="flex justify-between items-center border-b-2 border-[#ff00ff] pb-4 mb-6">
              <div className="text-[#ff00ff] font-bold text-xl tracking-tighter animate-pulse">DARK_SWAP</div>
              <div className="text-xs font-bold bg-[#ff00ff] text-black px-2 py-0.5">ESTABLISHED: 2024</div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scroll scrollbar-market">
              <div className="text-[10px] opacity-60 mb-2 uppercase tracking-widest">Available Exploits</div>
              {Object.values(TOOL_LIBRARY).map(tool => (
                <div key={tool.id} className="border border-[#ff00ff]/30 p-3 hover:border-[#ff00ff] transition-colors group relative overflow-hidden">
                  <div className="flex justify-between items-start mb-1">
                    <div className="font-bold text-sm tracking-tight">{tool.name}</div>
                    <div className="text-xs font-bold text-[#ff00ff]">{tool.price}Cr</div>
                  </div>
                  <p className="text-[10px] opacity-70 mb-2">{tool.description}</p>
                  <div className="flex justify-between items-center text-[9px] opacity-50">
                    <div>RAM: {tool.ramReq}MB | DISK: {tool.diskReq}GB</div>
                    <button 
                      onClick={() => executeCommand(`download ${tool.id}`)}
                      disabled={credits < tool.price}
                      className="text-[#ff00ff] border border-[#ff00ff] px-2 py-0.5 hover:bg-[#ff00ff] hover:text-black transition-colors disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-[#ff00ff] cursor-pointer"
                    >
                      ACQUIRE
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 pt-4 border-t-2 border-[#ff00ff]/20 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="opacity-60">BALANCE:</span>
                <span className="font-bold text-[#ff00ff]">{credits} Cr</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="opacity-60">REPUTATION:</span>
                <span className="font-bold text-[#ff00ff]">{reputation}</span>
              </div>
            </div>
            <button 
              onClick={() => setIsMarketGUIOpen(false)}
              className="mt-6 w-full py-2 bg-transparent border border-[#ff00ff] text-[#ff00ff] font-bold text-xs hover:bg-[#ff00ff]/10 tracking-widest cursor-pointer"
            >
              EXIT MARKETPLACE
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isTutorialOpen && (
          <div className="fixed inset-0 z-[5000] flex items-center justify-center bg-black font-mono">
            <div className="absolute inset-0 bg-[#00ff41]/5 opacity-20 pointer-events-none" />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-lg border border-[#00ff41]/20 bg-black p-10 relative overflow-hidden shadow-[0_0_100px_rgba(0,255,65,0.1)]"
            >
              <div className="text-center space-y-8">
                <div className="space-y-4">
                  <h1 className="text-4xl font-black tracking-tighter text-[#00ff41] flex flex-col">
                    <span className="opacity-40 text-xs tracking-[0.5em] mb-2 uppercase">A Forensic Hacking Thriller</span>
                    S I G N A L / V O I D
                  </h1>
                </div>

                <div className="space-y-4">
                  <button 
                    onClick={() => setAudioEnabled(!audioEnabled)}
                    className={`w-full py-4 border transition-all flex items-center justify-center gap-3 font-bold text-xs uppercase tracking-widest ${audioEnabled ? 'border-[#00ff41]/40 bg-[#00ff41]/10 text-[#00ff41]' : 'border-white/10 opacity-40 hover:opacity-100 text-white'}`}
                  >
                    {audioEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                    {audioEnabled ? '[ AUDIO_ACTIVE ] recommended' : '[ AUDIO_MUTED ]'}
                  </button>

                  <button 
                    onClick={runBootSequence}
                    className="w-full py-5 bg-[#00ff41] text-black hover:bg-white transition-all font-black tracking-[0.2em] text-sm uppercase shadow-[0_0_30px_rgba(0,255,65,0.4)]"
                  >
                    INITIALIZE_SESSION
                  </button>
                </div>

                <div className="pt-4 opacity-30 text-[9px] uppercase tracking-widest leading-relaxed">
                  The terminal will guide you from here.<br />
                  Stuck? Type <span className="text-[#00ff41] font-bold">help</span>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isBooting && (
          <div className="fixed inset-0 z-[5001] bg-black p-10 font-mono text-[11px] flex flex-col items-center justify-center">
            <div className="max-w-2xl w-full space-y-12">
              <div className="flex flex-col items-center gap-4">
                 <div className="w-16 h-1 bg-[#00ff41]/20 relative overflow-hidden">
                    <motion.div 
                      className="absolute inset-0 bg-[#00ff41]"
                      initial={{ left: '-100%' }}
                      animate={{ left: '100%' }}
                      transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                    />
                 </div>
                 <h1 className="text-2xl font-black italic tracking-[0.3em] text-[#00ff41] animate-pulse">SIGNAL/VOID</h1>
                 <span className="text-[9px] opacity-40 uppercase tracking-[0.5em]">The Weight of Dead Light</span>
              </div>

              <div className="bg-[#050505] border border-[#00ff41]/10 p-6 font-mono text-[10px] space-y-1 h-64 overflow-hidden relative">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,255,65,0.03)_0%,transparent_100%)]" />
                {bootingLines.reverse().slice(0, 15).reverse().map((line, i) => (
                  <div key={i} className="flex gap-4 text-[#00ff41]/80">
                    <span className="opacity-20 shrink-0 w-8">0x{i.toString(16).padStart(2, '0')}</span>
                    <span className="truncate">{line}</span>
                  </div>
                ))}
                {bootingLines.length > 0 && (
                  <div className="flex gap-4 text-[#00ff41] font-black">
                    <span className="opacity-20 shrink-0 w-8">--&gt;</span>
                    <TypewriterText text={bootingLines[bootingLines.length - 1]} speed={10} />
                  </div>
                )}
              </div>

              <div className="w-full space-y-2">
                <div className="flex justify-between text-[9px] font-bold text-[#00ff41]/40 uppercase tracking-widest">
                  <span>Kernel_Loading</span>
                  <span>{Math.round(bootProgress)}%</span>
                </div>
                <div className="w-full h-1 bg-[#002200]">
                  <motion.div 
                    className="h-full bg-[#00ff41] shadow-[0_0_10px_rgba(0,255,65,0.5)]"
                    initial={{ width: 0 }}
                    animate={{ width: `${bootProgress}%` }}
                  />
                </div>
              </div>

              <div className="flex justify-center italic opacity-30 text-[9px] animate-pulse">
                [ PRESS ANY KEY TO INITIALIZE KERNEL OVERRIDE ]
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>
      
      {isTracing && (
        <motion.div 
          animate={{ opacity: [0, 0.1, 0] }}
          transition={{ duration: 1, repeat: Infinity }}
          className="fixed inset-0 z-[190] bg-red-900/20 pointer-events-none"
        />
      )}

      {isGlitching && (
        <div className="fixed inset-0 z-[200] pointer-events-none overflow-hidden opacity-50 mix-blend-screen bg-red-900/10">
          <motion.div 
            animate={{ 
              top: [0, 20, -10, 0],
              left: [0, -10, 5, 0],
            }}
            transition={{ repeat: Infinity, duration: 0.1 }}
            className="absolute inset-0 border-4 border-red-500/20" 
          />
          <div className="absolute top-0 left-0 w-full h-[2px] bg-white/20 animate-[scanline_4s_linear_infinite]" />
        </div>
      )}
      
      {/* TOP METADATA (STRATA_STYLE) */}
      <div className="fixed top-0 right-0 z-[100] p-1 px-4 text-[9px] font-mono flex gap-4 pointer-events-none opacity-60">
        <div className="flex gap-2">
          <span className="opacity-40 uppercase">Location:</span>
          <span className="text-[#00ff41] font-bold tracking-widest">{currentNode.name.toUpperCase()}@{currentNode.ip}</span>
        </div>
        <div className="flex gap-2">
          <span className="opacity-40 uppercase">Home IP:</span>
          <span className="text-[#00ff41] font-bold tracking-widest">{nodes['home'].ip}</span>
        </div>
        <div className="text-[#00ff41]/40 tracking-tighter">LOC_STABLE_SIGNAL</div>
      </div>
      
      {/* HEADER: STATUS & TRACE */}
      <header className="h-[60px] border-b border-[#004400]/40 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-between shrink-0 relative overflow-hidden">
        <div className="flex items-center h-full">
           <div className="flex items-center px-4 gap-6 h-full border-r border-[#004400]/40 group cursor-pointer hover:bg-white/5 transition-colors" onClick={() => setShowCalendar(!showCalendar)}>
              <div className="flex flex-col">
                <span className="text-[9px] font-bold text-[#00ff41]/40 leading-none tracking-widest">STARDATE_SYNC</span>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold tracking-[0.2em] glow-text leading-tight text-white">{formatStrataTime(inGameDate)}</span>
                  <Calendar className="w-3 h-3 text-[#00ff41]/40 group-hover:text-[#00ff41] transition-colors" />
                </div>
              </div>
              <div className="flex flex-col border-l border-[#004400]/40 pl-4">
                <span className="text-[9px] font-bold text-[#00ff41]/40 leading-none tracking-widest uppercase">{formatStrataDate(inGameDate).split(' ')[1]}</span>
                <span className="text-xs font-bold tracking-widest opacity-80">{formatStrataDate(inGameDate).split(' ')[0]} {formatStrataDate(inGameDate).split(' ')[2]}</span>
              </div>
           </div>

           <div className="hidden lg:flex flex-col border-l border-[#004400]/40 pl-6 h-full justify-center mr-8">
              <motion.div 
                animate={heat > 80 ? {
                  x: [0, -2, 2, -1, 1, 0],
                  skewX: [0, 10, -10, 0],
                  color: ['#ffffff', '#ff0000', '#00ff41'],
                  filter: ['blur(0px)', 'blur(1px)', 'blur(0px)']
                } : {}}
                transition={{ repeat: Infinity, duration: 0.15 }}
              >
                <div className="text-[10px] font-black tracking-[0.4em] text-white">CORPORATE_IMPACT</div>
                <div className="text-[8px] font-bold opacity-30 tracking-[0.2em] uppercase">SYSTEM_HEAT: {heat.toFixed(1)}%</div>
              </motion.div>
           </div>
           
           
           <div className="hidden xl:flex items-center h-full px-6 gap-8">
              <div className="flex flex-col gap-1 w-24">
                <span className="text-[8px] font-bold opacity-30 tracking-widest uppercase">RAM_POOL</span>
                <div className="h-1 bg-white/5 flex gap-[1px]">
                   {Array.from({ length: 12 }).map((_, i) => (
                     <div 
                       key={i} 
                       className="flex-1 h-full"
                       style={{ 
                         backgroundColor: (ramUsage / totalRam * 12) > i ? (ramUsage > totalRam * 0.9 ? '#ef4444' : '#00ff41') : 'transparent',
                         opacity: (ramUsage / totalRam * 12) > i ? 1 : 0.1
                       }}
                     />
                   ))}
                </div>
              </div>
              
              <div className="flex flex-col gap-1 w-24">
                <span className="text-[8px] font-bold opacity-30 tracking-widest uppercase">DISK_S3</span>
                <div className="h-1 bg-white/5 flex gap-[1px]">
                   {Array.from({ length: 12 }).map((_, i) => (
                     <div 
                       key={i} 
                       className="flex-1 h-full"
                       style={{ 
                         backgroundColor: (storageUsage / totalDisk * 12) > i ? (storageUsage > totalDisk * 0.9 ? '#ef4444' : '#00ff41') : 'transparent',
                         opacity: (storageUsage / totalDisk * 12) > i ? 1 : 0.1
                       }}
                     />
                   ))}
                </div>
              </div>
           </div>
        </div>

        <div className="flex items-center h-full divide-x divide-[#004400]/40">
           {isTracing ? (
             <div className={`px-6 flex flex-col justify-center h-full bg-red-950/20 min-w-[300px] ${traceProgress > 80 ? 'animate-liquid' : ''}`}>
                <div className="flex justify-between items-baseline mb-1">
                   <span className="text-[9px] font-black tracking-widest text-red-500 animate-pulse">SECURITY_TRACE_ACTIVE</span>
                   <span className="text-sm font-mono font-black text-red-400">{traceProgress.toFixed(1)}%</span>
                </div>
                <div className="h-2 bg-red-950/40 border border-red-500/30 p-[1px]">
                   <motion.div 
                    className="h-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]"
                    animate={{ width: `${traceProgress}%` }}
                   />
                </div>
             </div>
           ) : (
             <div className="flex items-center h-full">
                <div className="px-6 flex flex-col justify-center">
                   <span className="text-[8px] font-bold text-[#00ff41]/40 tracking-widest uppercase">CREDITS</span>
                   <span className="text-sm font-bold text-[#00ff41]">{credits.toLocaleString()}c</span>
                </div>
                <div className="px-6 flex flex-col justify-center bg-[#00ff41]/5">
                   <span className="text-[8px] font-bold text-[#00ff41]/40 tracking-widest uppercase">STATION</span>
                   <span className="text-xs font-bold text-white tracking-widest uppercase truncate max-w-[120px]">{currentNode.ip}</span>
                </div>
             </div>
           )}
           
            <div className="px-4 flex items-center h-full gap-2">
              <motion.button 
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setIsExplorerOpen(!isExplorerOpen)}
                className={`p-2 transition-colors rounded-full ${isExplorerOpen ? 'bg-[#00ff41]/20 text-[#00ff41]' : 'hover:bg-white/5 opacity-40 hover:opacity-100'}`}
                title="Toggle File Explorer"
              >
                <Folder className="w-4 h-4" />
              </motion.button>
              <motion.button 
                whileHover={{ scale: 1.1, rotate: 90 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setIsSettingsOpen(true)}
                className="p-2 hover:bg-white/5 transition-colors rounded-full"
              >
                <Settings2 className="w-4 h-4 opacity-40 hover:opacity-100" />
              </motion.button>
           </div>
        </div>

        {/* CALENDAR OVERLAY */}
        <AnimatePresence>
          {showCalendar && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: -20 }}
              className="fixed top-[65px] left-4 z-[1001] w-72 glass-panel p-4 liquid-glass"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-4 border-b border-[#00ff41]/20 pb-2">
                <div className="flex flex-col">
                  <h3 className="text-sm font-bold text-white tracking-widest font-mono">AETHER_CALENDAR</h3>
                  <span className="text-[9px] opacity-40 font-mono tracking-tighter">SECURE_CHRONOS_LINK_v2.4</span>
                </div>
                <button onClick={() => setShowCalendar(false)} className="hover:text-white transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
              
              <div className="grid grid-cols-7 gap-1 text-center mb-2">
                {['S','M','T','W','T','F','S'].map((d, i) => (
                  <div key={i} className="text-[10px] font-bold opacity-40">{d}</div>
                ))}
              </div>
              
              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: 31 }).map((_, i) => (
                  <motion.div 
                    key={i}
                    whileHover={{ scale: 1.1, backgroundColor: 'rgba(0, 255, 65, 0.1)' }}
                    className={`aspect-square flex items-center justify-center text-[11px] border border-white/5 cursor-pointer transition-colors ${i + 1 === inGameDate.getDate() ? 'bg-[#00ff41] text-black font-bold shadow-[0_0_15px_rgba(0,255,65,0.4)]' : 'hover:border-[#00ff41]/30 text-white/80'}`}
                  >
                    {i + 1}
                  </motion.div>
                ))}
              </div>
              
              <div className="mt-4 p-3 bg-black/60 border border-[#00ff41]/10 text-[9px] tracking-tight">
                <div className="text-[#00ff41] font-bold mb-1 uppercase tracking-widest flex items-center gap-1">
                  <div className="w-1 h-1 bg-[#00ff41] animate-pulse" />
                  Upcoming Events:
                </div>
                <div className="space-y-1 opacity-60">
                  <div className="flex justify-between border-b border-white/5 pb-1">
                    <span>STRATA_MAINTENANCE</span>
                    <span>MAY 14</span>
                  </div>
                  <div className="flex justify-between">
                    <span>NEURAL_DENSITY_SYNC</span>
                    <span>MAY 22</span>
                  </div>
                </div>
              </div>
              <div className="glass-reflection" />
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* MAIN: 4-PANEL LAYOUT */}
      <main className="flex-1 grid grid-cols-12 gap-1 min-h-0">
        
        {/* LEFT COLUMN: RAM & NETMAP */}
        <div className="col-span-12 lg:col-span-3 flex flex-col gap-1 min-h-0">
          {/* RAM PANEL */}
          <section className="glass-panel flex-1 min-h-0 flex flex-col liquid-glass">
            <div className="glass-reflection opacity-20" />
            <div className="panel-header !border-white/10 bg-white/5 backdrop-blur-md">
              <span>RAM</span>
              <span>USED_RAM: {ramUsage}MB / {totalRam}MB</span>
            </div>
            <div className="flex-1 p-2 overflow-y-auto custom-scroll space-y-1">
              {processes.map(p => (
                <div key={p.id} className="ram-item">
                  <div className="ram-item-header">
                    <span className={p.name.includes('crack') ? 'text-yellow-400' : 'text-blue-400'}>
                      {p.name.toUpperCase()}@{nodes[p.targetNodeId]?.ip || '0.0.0.0'}
                    </span>
                    <span>{Math.floor(p.progress)}%</span>
                  </div>
                  <div className="progress-bar h-1">
                    <motion.div 
                      className={`h-full ${p.name.includes('crack') ? 'bg-yellow-400' : 'bg-blue-400'}`}
                      animate={{ width: `${p.progress}%` }}
                    />
                  </div>
                  <div className="ram-controls">
                    <motion.button 
                      whileHover={{ scale: 1.05, backgroundColor: 'rgba(239, 68, 68, 0.2)' }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => executeCommand(`kill ${p.id.slice(0, 4)}`)} 
                      className="ram-btn text-red-500 border-red-900/50"
                    >
                      close
                    </motion.button>
                    <button className="ram-btn opacity-30 cursor-not-allowed">overload</button>
                    <button className="ram-btn opacity-30 cursor-not-allowed">trap</button>
                  </div>
                </div>
              ))}
              {processes.length === 0 && (
                <div className="text-[10px] opacity-20 italic p-4 text-center">
                  NO ACTIVE PROCESSES IN RAM
                </div>
              )}
            </div>
          </section>

          {/* NETMAP PANEL */}
          <section className="glass-panel flex-1 min-h-0 relative flex flex-col overflow-hidden liquid-glass">
            <div className="glass-reflection opacity-10" />
            <div className="panel-header !border-white/10 bg-white/5 backdrop-blur-md">
              <span>netMap v2.0 // STRATA_EYE</span>
              <div className="flex gap-2">
                <span className="opacity-40">AUTO_SCAN</span>
                <div className="w-2 h-2 rounded-full bg-[#00ff41] animate-pulse" />
              </div>
            </div>
            <div className={`flex-1 relative overflow-hidden transition-colors duration-1000 ${matrixMode ? 'bg-[#001100]' : skylineMode ? 'bg-[#1a001a]' : 'bg-[#000800]'}`}>
              {/* NANO-GRID */}
              <div className="absolute inset-0 bg-[radial-gradient(#00ff41_0.5px,transparent_0.5px)] [background-size:12px_12px] opacity-[0.03] pointer-events-none" />
              <div className={`absolute inset-0 bg-grid-massive opacity-10 pointer-events-none ${matrixMode ? 'text-[#00ff41]' : ''}`} />
              
              {/* RADAR SCANNER SWEEP */}
              <motion.div 
                animate={{ rotate: 360 }}
                transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0 pointer-events-none opacity-[0.07]"
                style={{
                  background: 'conic-gradient(from 0deg at 50% 50%, #00ff41 0deg, transparent 90deg)'
                }}
              />
              
              {/* MATRIX RAIN EFFECT (Simplified) */}
              {matrixMode && (
                <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
                   {[...Array(20)].map((_, i) => (
                     <motion.div
                       key={`rain-${i}`}
                       initial={{ y: -100 }}
                       animate={{ y: 500 }}
                       transition={{ duration: 2 + Math.random() * 3, repeat: Infinity, ease: "linear" }}
                       className="absolute text-[#00ff41] font-mono text-[10px] whitespace-pre"
                       style={{ left: `${i * 5}%` }}
                     >
                       {Array(10).fill(0).map(() => String.fromCharCode(0x30A0 + Math.random() * 96)).join('\n')}
                     </motion.div>
                   ))}
                </div>
              )}

              {/* SKYLINE GLITCH EFFECT */}
              {skylineMode && (
                <motion.div 
                  animate={{ opacity: [0.1, 0.4, 0.1], scale: [1, 1.02, 1] }}
                  transition={{ duration: 0.2, repeat: Infinity }}
                  className="absolute inset-0 bg-white/5 pointer-events-none mix-blend-overlay z-50"
                />
              )}

              <AnimatePresence>
                {scanPulse && (
                  <motion.div 
                    initial={{ scale: 0, opacity: 1 }}
                    animate={{ scale: 2.5, opacity: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 1.5, ease: "easeOut" }}
                    className="absolute inset-0 border-2 border-[#00ff41] rounded-full pointer-events-none z-10"
                    style={{ transformOrigin: 'center' }}
                  />
                )}
              </AnimatePresence>

              <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                <defs>
                   <radialGradient id="nodeGlow" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor="#00ff41" stopOpacity="0.4" />
                      <stop offset="100%" stopColor="transparent" />
                   </radialGradient>
                </defs>

                {/* BACKGROUND CONNECTIVITY WEB (LATICE) */}
                {(Object.values(nodes) as Node[]).map((n, idx, arr) => {
                  const nodeX = ((n.x + 400) / 2000) * 90 + 5;
                  const nodeY = ((n.y + 300) / 1500) * 90 + 5;
                  
                  const nextNeighbors = [
                    arr[(idx + 1) % arr.length],
                    arr[(idx + 2) % arr.length]
                  ];
                  
                  return (
                    <g key={`lines-lattice-${n.id}`}>
                      {nextNeighbors.map((next, i) => {
                        const nx = ((next.x + 400) / 2000) * 90 + 5;
                        const ny = ((next.y + 300) / 1500) * 90 + 5;
                        return (
                          <line 
                            key={`${n.id}-lat-${i}`}
                            x1={nodeX} y1={nodeY}
                            x2={nx} y2={ny}
                            stroke="#00ff41" strokeWidth="0.04" opacity="0.05"
                          />
                        );
                      })}
                    </g>
                  );
                })}

                {/* ACTIVE SIGNAL PULSES */}
                {(Object.values(nodes) as Node[]).map(node => {
                  if (node.id === 'home') return null;
                  const hx = ((nodes['home'].x + 400) / 2000) * 90 + 5;
                  const hy = ((nodes['home'].y + 300) / 1500) * 90 + 5;
                  const nx = ((node.x + 400) / 2000) * 90 + 5;
                  const ny = ((node.y + 300) / 1500) * 90 + 5;

                  // Passive base line
                  return (
                    <g key={`signal-grp-${node.id}`}>
                       <line x1={hx} y1={hy} x2={nx} y2={ny} stroke="#00ff41" strokeWidth="0.05" opacity="0.1" />
                       
                       {/* Animated Signal Particle */}
                       {node.isUnlocked && (
                         <motion.circle
                            r="0.15"
                            fill="#00ff41"
                            animate={{
                              cx: [hx, nx],
                              cy: [hy, ny],
                              opacity: [0, 1, 0]
                            }}
                            transition={{
                              duration: 3 + Math.random() * 2,
                              repeat: Infinity,
                              ease: "linear",
                              delay: Math.random() * 2
                            }}
                         />
                       )}
                    </g>
                  );
                })}

                {/* CURRENT ACTIVE CONNECTION LINE */}
                {(Object.values(nodes) as Node[]).find(n => n.id === currentNodeId)?.id !== 'home' && (
                   <motion.line 
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      x1={((nodes['home'].x + 400) / 2000) * 90 + 5} 
                      y1={((nodes['home'].y + 300) / 1500) * 90 + 5}
                      x2={((currentNode.x + 400) / 2000) * 90 + 5} 
                      y2={((currentNode.y + 300) / 1500) * 90 + 5}
                      stroke="#00ff41" strokeWidth="0.15" strokeDasharray="0.5 0.2"
                      opacity="0.4"
                      className="animate-pulse"
                   />
                )}
              </svg>

              <div className="absolute inset-0 z-10 transition-transform duration-500">
                {(Object.values(nodes) as Node[]).map(node => {
                  const nodeX = ((node.x + 400) / 2000) * 90 + 5;
                  const nodeY = ((node.y + 300) / 1500) * 90 + 5;
                  const isActive = node.id === currentNodeId;
                  
                  // ISP Color Scheme
                  const ispColor = node.ispTier === 'BACKBONE' ? '#ffffff' : 
                                   node.ispTier === 'TIER_1' ? '#00e5ff' : 
                                   node.ispTier === 'TIER_2' ? '#ffaa00' : '#00ff41';

                  const nodeBorderColor = isActive ? ispColor : (node.ispTier ? `${ispColor}44` : '#004400');
                  
                  return (
                    <div
                      key={node.id}
                      className={`netmap-node group ${isActive ? 'active' : ''}`}
                      style={{ 
                        left: `${nodeX}%`, 
                        top: `${nodeY}%`,
                        borderColor: nodeBorderColor,
                        backgroundColor: isActive ? ispColor : 'transparent',
                        boxShadow: isActive ? `0 0 15px ${ispColor}66` : 'none'
                      }}
                      onClick={() => executeCommand(`connect ${node.ip}`)}
                      onMouseEnter={() => setHoveredNodeId(node.id)}
                      onMouseLeave={() => setHoveredNodeId(null)}
                    >
                      {/* NODE RING */}
                      <div className={`absolute -inset-1 border rounded-full ${isActive ? 'animate-ping' : ''}`} style={{ borderColor: `${ispColor}44` }} />
                      
                      {/* ISP TIER INDICATOR */}
                      {node.ispTier === 'BACKBONE' && (
                        <div className="absolute -inset-2 border-2 border-white/20 rounded-full animate-pulse" />
                      )}
                      
                      {/* MITM INTERCEPTION EFFECT */}
                      {node.isIntercepted && (
                        <div className="absolute -inset-4 border-2 border-yellow-500/30 rounded-full animate-pulse blur-[2px]">
                          <div className="absolute inset-0 border border-yellow-500 rounded-full animate-ping opacity-10" />
                          <div className="absolute inset-0 border border-dotted border-yellow-500/50 rounded-full animate-[spin_5s_linear_infinite]" />
                        </div>
                      )}
                      
                      {/* FIREWALL EFFECT */}
                      {node.firewall?.isActive && (
                        <div className="absolute -inset-3 border border-orange-500/30 rounded-full animate-[spin_10s_linear_infinite]">
                          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1.5 h-0.5 bg-orange-500 rounded-full shadow-[0_0_5px_#f97316]" />
                        </div>
                      )}
                      
                      {/* SMALLER CORE */}
                      <div className={`w-1 h-1 rounded-full ${node.isUnlocked ? (node.isIntercepted ? 'bg-yellow-400' : ispColor) : 'bg-gray-800 opacity-50'}`} />

                      {/* HOVER LABEL POPUP (Stylized) */}
                      <div className="absolute top-1/2 left-full ml-3 -translate-y-1/2 scale-0 group-hover:scale-100 transition-transform origin-left z-[60] pointer-events-none">
                         <div className="bg-black/90 border border-white/20 p-1 px-2 whitespace-nowrap" style={{ borderColor: ispColor }}>
                            <div className="text-[10px] font-bold select-none" style={{ color: ispColor }}>{node.name}</div>
                            <div className="text-[8px] opacity-40 select-none tracking-widest">{node.ip}</div>
                            {node.ispTier && (
                              <div className="text-[7px] font-bold mt-0.5 opacity-80" style={{ color: ispColor }}>
                                ISP: {node.ispName} [{node.ispTier}]
                              </div>
                            )}
                         </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Hover Tooltip inside map */}
              <AnimatePresence>
                {hoveredNodeId && nodes[hoveredNodeId] && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute bottom-1 left-1 right-1 p-1 bg-black/90 border border-[#00ff41]/20 text-[8px] z-20 pointer-events-none"
                  >
                    <span className="font-bold" style={{ color: nodes[hoveredNodeId].color }}>{nodes[hoveredNodeId].name}</span>
                    <span className="opacity-40"> | {nodes[hoveredNodeId].ip}</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </section>
        </div>

        {/* CENTER: DISPLAY AREA */}
        <section className="glass-panel col-span-12 lg:col-span-5 min-h-0 flex flex-col overflow-hidden liquid-glass">
           <div className="glass-reflection opacity-20" />
           <div className="panel-header !border-white/10 bg-white/5 backdrop-blur-md">
              <div className="flex gap-4 overflow-x-auto no-scrollbar whitespace-nowrap py-1 pr-4">
                <motion.button 
                  whileHover={{ scale: 1.05, y: -1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setActiveTab('node')}
                  className={`cursor-pointer hover:text-white transition-all ${activeTab === 'node' ? 'text-[#00ff41] border-b-2 border-[#00ff41] glow-text' : 'opacity-40'}`}
                >
                  DISPLAY
                </motion.button>
                <motion.button 
                  whileHover={{ scale: 1.05, y: -1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setActiveTab('missions')}
                  className={`cursor-pointer hover:text-white transition-all ${activeTab === 'missions' ? 'text-[#00ff41] border-b-2 border-[#00ff41] glow-text' : 'opacity-40'}`}
                >
                  MISSIONS
                </motion.button>
                <motion.button 
                  whileHover={{ scale: 1.05, y: -1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setActiveTab('mail')}
                  className={`cursor-pointer hover:text-white transition-all ${activeTab === 'mail' ? 'text-[#00ff41] border-b-2 border-[#00ff41] glow-text' : 'opacity-40'}`}
                >
                  MAIL
                </motion.button>
                <motion.button 
                  whileHover={{ scale: 1.05, y: -1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setActiveTab('browser')}
                  className={`cursor-pointer hover:text-white transition-all ${activeTab === 'browser' ? 'text-[#00ff41] border-b-2 border-[#00ff41] glow-text' : 'opacity-40'}`}
                >
                  BROWSER
                </motion.button>
                <motion.button 
                  whileHover={{ scale: 1.05, y: -1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setActiveTab('bots')}
                  className={`cursor-pointer hover:text-white transition-all ${activeTab === 'bots' ? 'text-[#ffaa00] border-b-2 border-[#ffaa00]' : 'opacity-40'}`}
                >
                  BOTS
                </motion.button>
                <motion.button 
                  whileHover={{ scale: 1.05, y: -1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setActiveTab('servers')}
                  className={`cursor-pointer hover:text-white transition-all ${activeTab === 'servers' ? 'text-cyan-400 border-b-2 border-cyan-400' : 'opacity-40'}`}
                >
                  SERVERS
                </motion.button>
                <motion.button 
                  whileHover={{ scale: 1.05, y: -1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setActiveTab('exploits')}
                  className={`cursor-pointer hover:text-white transition-all ${activeTab === 'exploits' ? 'text-red-500 border-b-2 border-red-500' : 'opacity-40'}`}
                >
                  EXPLOITS
                </motion.button>
                <motion.button 
                  whileHover={{ scale: 1.05, y: -1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setActiveTab('archive')}
                  className={`cursor-pointer hover:text-white transition-all ${activeTab === 'archive' ? 'text-amber-400 border-b-2 border-amber-400' : 'opacity-40'}`}
                >
                  ARCHIVE
                </motion.button>
                <motion.button 
                  whileHover={{ scale: 1.05, y: -1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setActiveTab('factions')}
                  className={`cursor-pointer hover:text-white transition-all ${activeTab === 'factions' ? 'text-purple-500 border-b-2 border-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.3)]' : 'opacity-40'}`}
                >
                  FACTIONS
                </motion.button>
              </div>
              <span className="opacity-40 font-mono text-[9px] tracking-[0.2em]">#{activeTab === 'browser' ? 'AETHER_BROWSER' : activeTab === 'bots' ? 'SWARM_COMMAND' : activeTab === 'servers' ? 'INFRASTRUCTURE' : activeTab === 'archive' ? 'VOID_SIGNAL_ARCHIVE' : activeTab === 'factions' ? 'POWER_BROKERS_GRID' : currentNode.id.toUpperCase()}</span>
           </div>

           <div className="flex-1 overflow-y-auto p-4 custom-scroll bg-black/40 relative">
              <div className="scan-line" />
              
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab + (activeTab === 'node' ? currentNode.id : '')}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className="h-full"
                >
                  {activeTab === 'exploits' && (
                    <div className="space-y-4">
                      <div className="flex justify-between items-center border-b border-red-500/20 pb-2">
                        <h3 className="text-sm font-bold text-red-500 tracking-tighter">EXPLOIT_DATABASE v4.0.2</h3>
                        <span className="text-[10px] opacity-40 font-mono tracking-widest uppercase">Global Cipher Repository</span>
                      </div>
                      <div className="grid grid-cols-1 gap-4">
                        {(exploitDb.length > 0 ? exploitDb : [
                          { id: 'ex_vp_1', name: 'Void-Breaker', targetProtocol: 'VOID_PULSE', cost: 1200, tier: 1, category: 'BUFFER_OVERFLOW', description: 'Destabilizes Void Pulse frequencies.' },
                          { id: 'ex_hc_1', name: 'Hydra-Slayer', targetProtocol: 'HYDRA_CORE', cost: 2500, tier: 2, category: 'ZERO_DAY', description: 'Injects corrupt logic into Hydra Core nodes.' },
                          { id: 'ex_im_1', name: 'Iron-Key', targetProtocol: 'IRON_MAIDEN', cost: 5000, tier: 3, category: 'SQL_INJECTION', description: 'Ultimate bypass for Iron Maiden defenses.' }
                        ] as Exploit[]).map(exploit => (
                          <div key={exploit.id} className="bg-white/5 border border-red-500/20 p-4 relative overflow-hidden group hover:border-red-500 transition-colors">
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <div className="text-sm font-bold text-white">{exploit.name}</div>
                                <div className="text-[10px] text-red-500 font-bold uppercase tracking-widest">Protocol: {exploit.targetProtocol}</div>
                              </div>
                              <div className="text-right">
                                <div className="text-sm font-bold text-white">{exploit.cost}c</div>
                                <div className="text-[9px] opacity-40 uppercase">TIER_{exploit.tier}</div>
                              </div>
                            </div>
                            <p className="text-xs opacity-60 mb-4">{exploit.description}</p>
                            <div className="flex justify-between items-center">
                              <span className="text-[9px] px-2 py-0.5 bg-red-500/10 text-red-500 border border-red-500/30">{exploit.category}</span>
                              <button 
                                onClick={() => executeCommand(`exploit buy ${exploit.id}`)}
                                disabled={credits < exploit.cost || inventory.includes(exploit.id)}
                                className={`text-[10px] px-4 py-1.5 font-bold transition-all ${inventory.includes(exploit.id) ? 'bg-red-500 text-black' : 'bg-transparent border border-red-500 text-red-500 hover:bg-red-500 hover:text-black cursors-pointer'} disabled:opacity-30 disabled:cursor-not-allowed`}
                              >
                                {inventory.includes(exploit.id) ? 'ACQUIRED' : 'PURCHASE'}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {activeTab === 'browser' && (
                <div className="flex flex-col h-full bg-black/60 border border-[#00ff41]/20 overflow-hidden">
                  {/* BROWSER TABS */}
                  <div className="flex items-center gap-1 bg-black/80 border-b border-[#00ff41]/20 p-1 overflow-x-auto no-scrollbar">
                    {browserTabs.map(tab => (
                      <div 
                        key={tab.id}
                        onClick={() => setActiveTabId(tab.id)}
                        className={`px-3 py-1.5 flex items-center gap-2 text-[10px] min-w-[120px] max-w-[180px] cursor-pointer transition-all border-b-2 ${activeTabId === tab.id ? 'bg-[#00ff41]/10 border-[#00ff41] text-[#00ff41]' : 'border-transparent opacity-40 hover:opacity-100 hover:bg-white/5'}`}
                      >
                        <Globe className={`w-3 h-3 ${activeTabId === tab.id ? 'text-[#00ff41]' : 'opacity-40'}`} />
                        <span className="truncate flex-1 tracking-tighter">{inGameWebsites[tab.url]?.title || tab.url}</span>
                        {browserTabs.length > 1 && (
                          <button 
                            onClick={(e) => { 
                              e.stopPropagation(); 
                              setBrowserTabs(prev => {
                                const filtered = prev.filter(t => t.id !== tab.id);
                                if (activeTabId === tab.id) {
                                  setActiveTabId(filtered[0]?.id || 'tab_1');
                                }
                                return filtered;
                              }); 
                            }}
                            className="hover:text-red-500 p-0.5 opacity-40 hover:opacity-100"
                          >
                            <XIcon className="w-2.5 h-2.5" />
                          </button>
                        )}
                      </div>
                    ))}
                    <button 
                      onClick={() => {
                        const newId = `tab_${Date.now().toString(36)}`;
                        setBrowserTabs(prev => [...prev, { id: newId, url: 'aether://home', history: ['aether://home'] }]);
                        setActiveTabId(newId);
                      }}
                      className="p-1 hover:bg-[#00ff41]/20 rounded-sm text-[#00ff41] ml-1"
                      title="New Tab"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Browser Toolbar */}
                  <div className="flex items-center gap-2 p-2 bg-black/40 border-b border-[#00ff41]/20">
                    <div className="flex gap-1">
                      <button onClick={() => browserHistory.length > 1 && setBrowserTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, url: t.history[t.history.length-2], history: t.history.slice(0, -1) } : t))} className="p-1 hover:text-[#00ff41] opacity-60"><ArrowLeft className="w-4 h-4" /></button>
                      <button className="p-1 opacity-20"><ArrowRight className="w-4 h-4" /></button>
                    </div>
                    <div className="flex-1 flex items-center bg-black border border-[#00ff41]/30 px-3 py-1 rounded-full text-xs font-mono">
                      <Globe className="w-3 h-3 mr-2 opacity-40" />
                      <input 
                        type="text" 
                        value={currentUrl} 
                        onChange={(e) => setBrowserTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, url: e.target.value } : t))}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            const val = (e.target as HTMLInputElement).value.toLowerCase();
                            if (val === 'google.com' || val === 'www.google.com') {
                              setBrowserTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, url: 'google.com', history: [...t.history, 'google.com'] } : t));
                            } else if (inGameWebsites[currentUrl]) {
                              setBrowserTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, history: [...t.history, currentUrl] } : t));
                            }
                          }
                        }}
                        className="bg-transparent border-none outline-none w-full text-[#00ff41]"
                      />
                    </div>
                    <button onClick={() => setBrowserTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, url: 'aether://home', history: [...t.history, 'aether://home'] } : t))} className="p-1 hover:text-[#00ff41] opacity-60"><Home className="w-4 h-4" /></button>
                    <button 
                      onClick={() => setIsInspectMode(!isInspectMode)} 
                      className={`p-1 hover:text-[#00ff41] transition-all ${isInspectMode ? 'text-yellow-500 opacity-100 animate-pulse' : 'opacity-30'}`}
                      title="Inspect Elements"
                    >
                      <TerminalIcon className="w-4 h-4" />
                    </button>
                  </div>
                  
                  {/* Browser Content */}
                  <div className="flex-1 p-6 overflow-y-auto custom-scroll font-sans bg-black/20 group relative">
                    {/* INSPECT OVERLAY */}
                    {isInspectMode && (
                      <div className="absolute inset-0 pointer-events-none border-2 border-dashed border-yellow-500/20 z-50 overflow-hidden">
                         <div className="absolute top-2 right-2 bg-yellow-500 text-black text-[9px] font-black px-2 py-0.5 animate-pulse">DEBUG_MODE::ACTIVE</div>
                      </div>
                    )}
                    
                    {inGameWebsites[currentUrl] ? (
                      <motion.div
                        key={currentUrl}
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={isInspectMode ? 'cursor-crosshair' : ''}
                        onClick={(e) => {
                          if (isInspectMode) {
                            const target = e.target as HTMLElement;
                            const currentText = target.innerText;
                            const newText = prompt("ALTER DOM CONTENT:", currentText);
                            if (newText !== null) {
                              // Heuristic mapping for simple text replacement in mock sites
                              if (currentUrl === 'aether://news' && currentText === "OMNICORP ANNOUNCES 'SECURE_CITY' INITIATIVE") {
                                setWebsiteModifications(prev => ({ ...prev, 'news_h1': newText }));
                              } else if (currentUrl === 'aether://home' && target.tagName === 'P') {
                                setWebsiteModifications(prev => ({ ...prev, 'aether://home_p1': newText }));
                              } else {
                                target.innerText = newText; // Direct DOM manip for local instance
                                addLog(`>> [DEBUG]: Altered DOM element on ${currentUrl}`);
                              }
                            }
                          }
                        }}
                      >
                        {inGameWebsites[currentUrl].isRestricted && !currentNode.isUnlocked ? (
                          <div className="flex flex-col items-center justify-center h-64 text-center">
                            <Lock className="w-12 h-12 text-red-500 mb-4" />
                            <h2 className="text-xl font-bold text-red-500 mb-2">ACCESS_DENIED</h2>
                            <p className="text-xs opacity-60 max-w-xs">You must establish a secure connection to the host node before viewing this page.</p>
                          </div>
                        ) : (
                          inGameWebsites[currentUrl].content
                        )}
                      </motion.div>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-64 text-center">
                        <ShieldAlert className="w-12 h-12 text-yellow-500 mb-4" />
                        <h2 className="text-xl font-bold text-yellow-500 mb-2">404: RESOURCE NOT FOUND</h2>
                        <p className="text-xs opacity-60">The requested URL was not found on the AETHER_NET server.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'node' && (
                <div className="flex flex-col h-full animate-in fade-in slide-in-from-bottom-4 duration-500">
                  {/* TRIAGE HEADER: SURFACE */}
                  <div className="flex justify-between items-start mb-6 border-b border-[#00ff41]/20 pb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <span className="text-[10px] font-bold text-[#00ff41] bg-[#00ff41]/10 px-2 py-0.5 tracking-widest uppercase">Surface // Service_Banner</span>
                        <span className="text-[10px] opacity-40 font-mono tracking-tighter">LATENCY: {Math.floor(Math.random() * 20) + 30}ms</span>
                      </div>
                      <h2 className="text-4xl font-bold tracking-tighter glow-text" style={{ color: currentNode.color }}>{currentNode.name}</h2>
                      <div className="flex items-center gap-4 mt-1">
                        <span className="text-sm font-bold opacity-60 font-mono tracking-widest">{currentNode.ip}</span>
                        <div className="flex gap-2">
                           <span className="text-[9px] px-1 bg-white/5 border border-white/10 opacity-60">OS: {currentNode.os || 'GENERIC'}</span>
                           <span className="text-[9px] px-1 bg-white/5 border border-white/10 opacity-60">KERNEL: {currentNode.kernel || 'LABYRINTH_v1'}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                       <div className="text-[9px] font-bold opacity-30 tracking-[0.2em] uppercase mb-2">Continuity // The_Gradient</div>
                       <div className="flex flex-col gap-1 items-end">
                          {Object.entries(usedTechniques).map(([tech, count]) => (
                            <div key={tech} className="flex items-center gap-2">
                               <span className="text-[7px] opacity-40 uppercase tracking-tighter">{tech.replace('_', ' ')}:</span>
                               <div className="flex gap-0.5">
                                  {Array.from({ length: 5 }).map((_, i) => (
                                    <div key={i} className={`w-0.5 h-2 border ${i < (count as number) ? 'border-red-500 bg-red-500' : 'border-white/10 bg-transparent'}`} />
                                  ))}
                               </div>
                            </div>
                          ))}
                          {Object.keys(usedTechniques).length === 0 && <span className="text-[8px] opacity-10 uppercase italic">No distinct patterns detected</span>}
                       </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1 min-h-0">
                    {/* LEFT: STACK (Process Hooks & Memory Fragments) */}
                    <div className="flex flex-col gap-4 border-r border-[#00ff41]/10 pr-6 overflow-y-auto custom-scroll">
                      <div className="space-y-6">
                        <section className="space-y-3">
                          <div className="text-[10px] text-blue-400 font-bold border-b border-blue-900/40 pb-1 flex justify-between uppercase tracking-[0.2em]">
                            <span>Stack // Memory_Hooks</span>
                            <span className={isTracing ? 'text-red-500 animate-pulse' : 'opacity-40'}>{isTracing ? '!! WATCHED !!' : 'SECURE'}</span>
                          </div>
                          
                          <div className="space-y-2">
                             {currentNode.ports.map(p => {
                               const activeProc = processes.find(proc => proc.targetNodeId === currentNode.id && proc.portNumber === p.number);
                               return (
                                <div key={p.number} className={`p-3 border transition-all relative overflow-hidden group ${p.isBroken ? 'border-cyan-500/40 bg-cyan-900/5' : activeProc ? 'border-yellow-500/50 bg-yellow-900/10' : 'border-white/5 bg-black/40 hover:bg-white/5'}`}>
                                   <div className="flex justify-between text-[11px] font-bold mb-2">
                                      <span className="flex items-center gap-2">
                                        <Box className={`w-3 h-3 ${p.isBroken ? 'text-cyan-400' : 'opacity-40'}`} />
                                        {p.service} <span className="opacity-40 text-[9px]">P:{p.number}</span>
                                      </span>
                                      {activeProc ? (
                                        <span className="text-yellow-400 animate-pulse text-[9px]">L_SYNC: {activeProc.progress.toFixed(0)}%</span>
                                      ) : (
                                        <span className={`text-[10px] ${p.isBroken ? 'text-cyan-400' : 'opacity-20'}`}>
                                          {p.isBroken ? 'BYPASSED' : 'ENCRYPTED'}
                                        </span>
                                      )}
                                   </div>
                                   <div className="h-0.5 bg-white/5 relative overflow-hidden">
                                      <motion.div 
                                        className={`h-full ${p.isBroken ? 'bg-cyan-500 shadow-[0_0_10px_#06b6d4]' : activeProc ? 'bg-yellow-500' : 'bg-transparent'}`} 
                                        animate={{ width: p.isBroken ? '100%' : activeProc ? `${activeProc.progress}%` : '0%' }}
                                      />
                                   </div>
                                   {p.isBroken && <div className="absolute top-0 right-0 w-8 h-8 bg-cyan-500/10 blur-xl pointer-events-none" />}
                                </div>
                               );
                             })}
                          </div>
                        </section>
                      </div>
                    </div>

                    {/* RIGHT: HISTORY (Recovered Logs & Hidden Files) */}
                    <div className="flex flex-col gap-6 overflow-y-auto custom-scroll pl-2 transition-all">
                      <section className="space-y-4">
                        <div className="text-[10px] text-yellow-500 font-bold border-b border-yellow-900/40 pb-1 flex justify-between uppercase tracking-widest">
                          <span>History // Log_Deltas</span>
                          <span className="opacity-40 font-mono tracking-tighter">RCV_MODE: ARCHIVE</span>
                        </div>

                        {/* FILE GRID */}
                        <div className="grid grid-cols-2 gap-2">
                          {currentPath.length > 0 && (
                            <div 
                              className="p-3 border border-dashed border-white/10 hover:border-[#ffaa00] bg-white/2 cursor-pointer transition-all flex items-center gap-2 group"
                              onClick={() => executeCommand('cd ..')}
                            >
                               <Folder className="w-4 h-4 text-[#ffaa00] opacity-40 group-hover:opacity-100" />
                               <div className="text-[10px] font-bold group-hover:text-white uppercase tracking-tighter">.. [UP]</div>
                            </div>
                          )}
                          {getFilesAtCurrentPath().map(f => (
                             <motion.div 
                              key={f.name} 
                              initial={{ opacity: 0, scale: 0.95 }}
                              animate={{ opacity: 1, scale: 1 }}
                              className={`p-3 border transition-all cursor-pointer group relative flex items-center gap-2 ${f.type === 'dir' ? 'border-[#ffaa00]/30 bg-[#ffaa00]/5 hover:border-[#ffaa00] hover:bg-[#ffaa00]/10' : 'border-blue-500/30 bg-blue-500/5 hover:border-blue-500 hover:bg-blue-500/10'}`}
                              onClick={() => f.type === 'dir' ? executeCommand(`cd ${f.name}`) : executeCommand(`cat ${f.name}`)}
                            >
                               {f.type === 'dir' ? <Folder className="w-3 h-3 text-[#ffaa00]" /> : <File className="w-3 h-3 text-blue-500" />}
                               <div className="flex-1 min-w-0">
                                   <div className={`text-[10px] font-black truncate tracking-tighter ${f.type === 'dir' ? 'text-[#ffaa00]' : 'text-blue-500'}`}>
                                       {f.name}
                                   </div>
                               </div>
                               {f.type === 'file' && (
                                 <button 
                                   onClick={(e) => { e.stopPropagation(); executeCommand(`scp ${f.name}`); }}
                                   className="opacity-0 group-hover:opacity-100 p-1 hover:bg-[#00ff41]/20 transition-all text-[#00ff41]"
                                 >
                                    <Zap className="w-3 h-3" />
                                 </button>
                               )}
                             </motion.div>
                           ))}
                        </div>

                        {/* FORENSIC DELTAS */}
                        <div className="mt-8 space-y-3">
                           <div className="text-[10px] font-black text-red-500/80 uppercase tracking-widest flex items-center gap-2">
                              <Archive className="w-4 h-4 text-red-500" />
                              DELETED_SHARDS // FORENSIC
                           </div>
                           <div className="p-4 bg-red-950/10 border border-red-900/30 space-y-3 rounded-sm border-l-4 border-l-red-500/40">
                              {currentNode.isUnlocked ? (
                                <>
                                  <div className="flex justify-between items-center text-[11px] group">
                                     <span className="opacity-40 italic tracking-tighter">~$CORE_STATION_MAP.PDF.TMP</span>
                                     <button className="text-[9px] text-red-400 hover:text-red-300 font-bold tracking-widest uppercase transition-colors">Recover</button>
                                  </div>
                                  <div className="text-[8px] opacity-20 text-center mt-4 tracking-widest">— SCANNED BY VOID_ARCHAEOLOGY v0.9.1 —</div>
                                </>
                              ) : (
                                <div className="text-[10px] opacity-20 py-4 text-center italic font-mono">
                                   [!] NODE_BYPASS_REQUIRED_FOR_FORENSIC_SWEEP
                                </div>
                              )}
                           </div>
                        </div>
                      </section>
                    </div>
                  </div>
                </div>
              )}


              {activeTab === 'missions' && ( // REAL_ONE
                <div className="space-y-4">
                  <div className="text-xl font-bold tracking-widest border-b border-[#00ff41]/30 pb-2">ACTIVE_OBJECTIVES</div>
                  <div className="space-y-3">
                    {missions.map((mission, idx) => (
                      <motion.div 
                        key={mission.id} 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        className={`p-4 border ${mission.completed ? 'border-[#00ff41]/20 opacity-40' : mission.id === activeMissionId ? 'border-[#00ff41] bg-[#00ff41]/5' : 'border-[#004400]'}`}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="font-bold text-sm tracking-tight">{mission.title}</h3>
                          {mission.completed && <span className="text-[10px] bg-[#00ff41] text-black px-1 font-bold">COMPLETED</span>}
                        </div>
                        <p className="text-xs opacity-70 mb-3">{mission.description}</p>
                        {!mission.completed && mission.id !== activeMissionId && (
                          <button 
                            onClick={() => setActiveMissionId(mission.id)}
                            className="text-[10px] border border-[#00ff41] px-2 py-1 hover:bg-[#00ff41] hover:text-black transition-colors cursor-pointer"
                          >
                            ACCEPT MISSION
                          </button>
                        )}
                      </motion.div>
                    ))}
                    {missions.length === 0 && <div className="text-xs opacity-30 italic">No missions found in current sector.</div>}
                  </div>
                </div>
              )}
              
              {activeTab === 'bots' && (
                <div className="space-y-6">
                  <div className="flex justify-between items-end border-b border-[#ffaa00]/30 pb-2">
                    <div>
                      <h2 className="text-xl font-bold tracking-widest text-[#ffaa00]">SWARM_CONTROL_v4.0</h2>
                      <p className="text-[10px] opacity-40">Connected Agents: {bots.length} / UNLIMITED</p>
                    </div>
                    <div className="text-right">
                       <span className="text-[10px] block opacity-40 uppercase">Global Efficiency</span>
                       <span className="text-sm font-bold text-[#ffaa00]">{(bots.reduce((acc, b) => acc + (b.status === 'ACTIVE' ? b.efficiency : 0), 0) * 100).toFixed(0)}%</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {bots.map(bot => (
                      <motion.div 
                        key={bot.id}
                        layout
                        className={`p-4 border ${bot.status === 'COMPROMISED' ? 'border-red-500/40 bg-red-500/5' : 'border-[#ffaa00]/20 bg-black/40'} relative overflow-hidden`}
                      >
                         <div className="flex justify-between items-start mb-3">
                            <div className="flex items-center gap-3">
                               <div className={`p-2 rounded ${bot.status === 'COMPROMISED' ? 'bg-red-500/20' : 'bg-[#ffaa00]/20'}`}>
                                  {bot.type === 'MINING' ? <Activity className="w-4 h-4 text-[#ffaa00]" /> : 
                                   bot.type === 'PROTECT' ? <ShieldAlert className="w-4 h-4 text-cyan-400" /> : 
                                   <Search className="w-4 h-4 text-blue-400" />}
                               </div>
                               <div>
                                  <div className="text-sm font-bold text-white uppercase">{bot.name}</div>
                                  <div className="text-[9px] opacity-40">TARGET: {bot.targetNodeId}</div>
                               </div>
                            </div>
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 ${bot.status === 'ACTIVE' ? 'bg-[#00ff41] text-black' : 'bg-red-500 text-white'}`}>
                               {bot.status}
                            </span>
                         </div>

                         <div className="space-y-2">
                            <div className="flex justify-between text-[10px]">
                               <span className="opacity-40 uppercase">Core Stability</span>
                               <span>{(bot.efficiency * 100).toFixed(0)}%</span>
                            </div>
                            <div className="h-1 bg-black/60 overflow-hidden">
                               <motion.div 
                                className={`h-full ${bot.status === 'COMPROMISED' ? 'bg-red-500' : 'bg-[#ffaa00]'}`} 
                                animate={{ width: `${bot.efficiency * 100}%` }}
                               />
                            </div>
                         </div>

                         <div className="mt-4 flex gap-2">
                            <button 
                              onClick={() => {
                                setBots(prev => prev.filter(b => b.id !== bot.id));
                                addLog(`>> BOT_RECALLED: ${bot.name}`);
                              }}
                              className="text-[10px] border border-white/10 px-2 py-1 hover:bg-white/5 transition-all uppercase"
                            >
                              Recall
                            </button>
                            {bot.status === 'ACTIVE' && (
                              <button 
                                onClick={() => {
                                   addLog(`>> BOT_OVERCLOCKING: ${bot.name}`);
                                   setBots(prev => prev.map(b => b.id === bot.id ? { ...b, efficiency: b.efficiency + 0.2 } : b));
                                }}
                                className="text-[10px] border border-[#ffaa00] text-[#ffaa00] px-2 py-1 hover:bg-[#ffaa00] hover:text-black transition-all uppercase"
                              >
                                Overclock
                              </button>
                            )}
                         </div>

                         <div className="absolute top-0 right-0 p-1 opacity-[0.03] select-none pointer-events-none">
                            <div className="text-[40px] font-bold font-mono">{bot.type.slice(0,1)}</div>
                         </div>
                      </motion.div>
                    ))}
                  </div>

                  {bots.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-20 border border-dashed border-white/10 opacity-30">
                       <Plus className="w-8 h-8 mb-2" />
                       <p className="text-sm uppercase tracking-widest font-bold">No agents detected.</p>
                       <p className="text-[10px] mt-1 font-mono">Use 'bot create [name] [type]' in terminal.</p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'servers' && (
                <div className="space-y-6">
                  <div className="flex justify-between items-end border-b border-cyan-500/30 pb-2">
                    <div>
                      <h2 className="text-xl font-bold tracking-widest text-cyan-400">INFRA_VIRTUAL_MANAGER</h2>
                      <p className="text-[10px] opacity-40 uppercase">Active Shards: {userServers.length} / 12</p>
                    </div>
                    <div className="text-right">
                       <span className="text-[10px] block opacity-40 uppercase">Total Revenue</span>
                       <span className="text-sm font-bold text-cyan-400">{userServers.reduce((acc, s) => acc + (s.status === 'ONLINE' ? s.incomePerCycle - s.costPerCycle : 0), 0)}c / cycle</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3">
                    {userServers.map(server => (
                      <motion.div 
                        key={server.id}
                        initial={{ x: -20, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        className="bg-black/60 border border-cyan-500/10 p-4 flex items-center justify-between group hover:border-cyan-500/40 transition-all liquid-glass"
                      >
                         <div className="flex items-center gap-4">
                            <div className={`p-3 rounded-full ${server.status === 'ONLINE' ? 'bg-cyan-500/10 text-cyan-400' : 'bg-gray-800 text-gray-500'}`}>
                               {server.type === 'COMPUTE' ? <Cpu className="w-5 h-5" /> : 
                                server.type === 'STORAGE' ? <HardDrive className="w-5 h-5" /> : 
                                <Globe className="w-5 h-5" />}
                            </div>
                            <div>
                               <div className="flex items-center gap-2">
                                  <span className="text-sm font-bold text-white uppercase tracking-wider">{server.name}</span>
                                  <span className="text-[8px] border border-cyan-500/30 px-1 text-cyan-400">TIER_{server.tier}</span>
                               </div>
                               <div className="flex items-center gap-3 mt-1">
                                  <div className="flex items-center gap-1">
                                     <div className={`w-1.5 h-1.5 rounded-full ${server.status === 'ONLINE' ? 'bg-[#00ff41] animate-pulse' : 'bg-red-500'}`} />
                                     <span className="text-[9px] opacity-60 uppercase">{server.status}</span>
                                  </div>
                                  <span className="text-[9px] opacity-20">|</span>
                                  <span className="text-[9px] opacity-60">LOAD: {server.currentLoad}%</span>
                               </div>
                            </div>
                         </div>

                         <div className="flex items-center gap-8 text-right">
                            <div>
                               <span className="text-[9px] block opacity-40 uppercase">Net Yield</span>
                               <span className="text-sm font-mono font-bold text-[#00ff41]">+{server.incomePerCycle - server.costPerCycle}c</span>
                            </div>
                            <div className="flex gap-2">
                               <button 
                                 onClick={() => {
                                   setUserServers(prev => prev.map(s => s.id === server.id ? { ...s, status: s.status === 'ONLINE' ? 'OFFLINE' : 'ONLINE' } : s));
                                 }}
                                 className="p-2 border border-white/5 hover:bg-white/5 transition-all"
                               >
                                  <Play className={`w-3 h-3 ${server.status === 'ONLINE' ? 'text-red-500 rotate-90' : 'text-[#00ff41]'}`} />
                               </button>
                               <button 
                                 onClick={() => {
                                   setUserServers(prev => prev.filter(s => s.id !== server.id));
                                   addLog(`>> SERVER_DECOMMISSIONED: ${server.name}`);
                                 }}
                                 className="p-2 border border-white/5 hover:bg-red-500/10 transition-all text-red-500"
                               >
                                  <X className="w-3 h-3" />
                               </button>
                            </div>
                         </div>
                      </motion.div>
                    ))}
                  </div>

                  {userServers.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-20 border border-dashed border-cyan-500/10 opacity-30">
                       <Server className="w-8 h-8 mb-2 text-cyan-400" />
                       <p className="text-sm uppercase tracking-widest font-bold">No active infrastructure.</p>
                       <p className="text-[10px] mt-1 font-mono">Use 'server rent [type]' in terminal.</p>
                    </div>
                  )}
                  
                  <div className="p-4 bg-cyan-500/5 border border-cyan-500/10">
                     <h4 className="text-[10px] font-bold text-cyan-400 uppercase mb-2 tracking-widest">Available Upgrades</h4>
                     <div className="grid grid-cols-3 gap-2">
                        <div className="p-2 border border-white/5 opacity-40 cursor-not-allowed">
                           <div className="text-[9px] font-bold text-white">Quantum Sharding</div>
                           <div className="text-[8px] text-cyan-400">25,000c</div>
                        </div>
                        <div className="p-2 border border-white/5 opacity-40 cursor-not-allowed">
                           <div className="text-[9px] font-bold text-white">Neural Load Balancer</div>
                           <div className="text-[8px] text-cyan-400">12,000c</div>
                        </div>
                        <div className="p-2 border border-white/5 opacity-40 cursor-not-allowed">
                           <div className="text-[9px] font-bold text-white">Void Proxy Router</div>
                           <div className="text-[8px] text-cyan-400">8,500c</div>
                        </div>
                     </div>
                  </div>
                </div>
              )}

                  {activeTab === 'archive' && (
                    <div className="space-y-6">
                      <div className="flex justify-between items-end border-b border-amber-500/30 pb-4">
                        <div>
                          <h2 className="text-2xl font-black tracking-tighter text-amber-500 flex items-center gap-3 lowercase">
                            <Archive className="w-8 h-8" />
                            signal_archive
                          </h2>
                          <p className="text-[10px] opacity-40 uppercase tracking-[0.3em] mt-1">Forensic Interpretation // Lazarus Sequence</p>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] block opacity-40 uppercase tracking-widest font-mono">Sync_Progress</span>
                          <span className="text-2xl font-mono text-amber-500 leading-none">
                            {lazarusFragments.length}/5
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Shard List */}
                        <div className="lg:col-span-1 space-y-2">
                           <span className="text-[8px] font-black opacity-30 uppercase tracking-[0.2em] mb-2 block">Recovered_Assets</span>
                           {['FRAGMENT_ALPHA', 'FRAGMENT_BETA', 'FRAGMENT_GAMMA', 'FRAGMENT_DELTA', 'FRAGMENT_EPSILON'].map((shard) => {
                             const isAcquired = lazarusFragments.includes(shard);
                             return (
                               <button 
                                 key={shard} 
                                 disabled={!isAcquired}
                                 onClick={() => {
                                   setSelectedShard(shard);
                                   playBeep(400, 'sine', 0.05, 0.1);
                                 }}
                                 className={`w-full p-4 border text-left transition-all relative overflow-hidden group ${isAcquired ? (selectedShard === shard ? 'bg-amber-500/10 border-amber-500' : 'bg-black border-white/10 hover:border-amber-500/50') : 'border-white/5 opacity-10 cursor-not-allowed'}`}
                               >
                                 <div className="flex justify-between items-center relative z-10">
                                   <span className={`text-[10px] font-black tracking-tight uppercase ${selectedShard === shard ? 'text-amber-500' : 'text-white/60'}`}>{shard}</span>
                                   {isAcquired && <ShieldCheck className={`w-3 h-3 ${selectedShard === shard ? 'text-amber-500' : 'text-white/20'}`} />}
                                 </div>
                                 {isAcquired && selectedShard === shard && (
                                   <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-500" />
                                 )}
                               </button>
                             );
                           })}
                        </div>

                        {/* Interpretation Engine */}
                        <div className="lg:col-span-2 border border-white/10 bg-black/40 flex flex-col p-6 relative overflow-hidden">
                           <div className="absolute top-0 right-0 p-2 opacity-5 pointer-events-none">
                             <Fingerprint className="w-24 h-24 text-amber-500" />
                           </div>

                           {!selectedShard ? (
                             <div className="flex-1 flex flex-col items-center justify-center text-center opacity-20">
                                <Zap className="w-12 h-12 mb-4" />
                                <p className="text-xs uppercase tracking-widest font-mono italic leading-relaxed">
                                  "Truth is not binary.<br/>It is reassembled from the noise."
                                </p>
                             </div>
                           ) : (
                             <div className="space-y-6 relative z-10">
                               <div className="flex justify-between items-center border-b border-white/5 pb-4">
                                 <h3 className="text-sm font-black text-amber-500 uppercase tracking-widest italic">{selectedShard}_FORENSICS</h3>
                                 <span className="text-[9px] font-mono opacity-40">HASH: {Math.random().toString(36).substring(2, 10).toUpperCase()}</span>
                               </div>

                               <div className="space-y-4">
                                 <div className="space-y-2">
                                    <span className="text-[9px] font-bold text-emerald-500/60 uppercase">Primary_Reconstruction</span>
                                    <p className="text-xs text-white/80 leading-relaxed italic">
                                      {selectedShard === 'FRAGMENT_ALPHA' ? "The signal was sent from a secure terminal within the Citadel, but the power draw suggests it originated elsewhere." :
                                       selectedShard === 'FRAGMENT_BETA' ? "Server logs show Mara Voss was terminated in 2033. However, dental records from Sector-4 suggest she survived the purge." :
                                       "Metadata corrupted. Reconstructing path... [TRUNCATED]"}
                                    </p>
                                 </div>

                                 <div className="space-y-2 p-4 bg-red-500/5 border-l-2 border-red-500/50">
                                    <span className="text-[9px] font-bold text-red-500/60 uppercase">Contradictory_Artifact</span>
                                    <p className="text-xs text-red-400/80 leading-relaxed italic">
                                      {selectedShard === 'FRAGMENT_ALPHA' ? "REVISION: The terminal MAC address matches a device that was decommissioned three years prior to the transmission." :
                                       selectedShard === 'FRAGMENT_BETA' ? "REVISION: Biometric scanners at Sector-4 were malfunctioning. Presence of target VOSS_M is non-conclusive." :
                                       "REVISION: Internal timestamps don't match the relay sequence. The message is its own origin."}
                                    </p>
                                 </div>
                               </div>

                               <div className="pt-6 border-t border-white/5 grid grid-cols-3 gap-6">
                                  <div className="space-y-1">
                                    <span className="text-[8px] opacity-30 uppercase font-bold">Reliability</span>
                                    <div className="h-1 bg-white/5 flex gap-0.5">
                                      <div className="flex-1 bg-amber-500" />
                                      <div className="flex-1 bg-amber-500" />
                                      <div className="flex-1 bg-white/10" />
                                      <div className="flex-1 bg-white/10" />
                                    </div>
                                  </div>
                                  <div className="space-y-1">
                                    <span className="text-[8px] opacity-30 uppercase font-bold">Noise_Pollution</span>
                                    <div className="h-1 bg-white/5 flex gap-0.5">
                                      <div className="flex-1 bg-red-500" />
                                      <div className="flex-1 bg-white/10" />
                                      <div className="flex-1 bg-white/10" />
                                      <div className="flex-1 bg-white/10" />
                                    </div>
                                  </div>
                                  <div className="space-y-1 text-right">
                                    <span className="text-[8px] opacity-30 uppercase font-bold">Source</span>
                                    <span className="text-[10px] font-mono block text-white/60 tracking-tighter">192.168.1.104</span>
                                  </div>
                               </div>
                             </div>
                           )}
                        </div>
                      </div>

                      {hasDecodedLazarus && (
                        <div className="space-y-3 pt-6 border-t border-amber-500/20">
                          <h4 className="text-[10px] font-bold text-amber-500 uppercase tracking-widest">Protocol Execution Choices</h4>
                          <div className="grid grid-cols-1 gap-2">
                            <button 
                              onClick={() => {
                                 addLog(">> EXECUTING_CONFRONT_PROTOCOL: THE_LAST_BLIND_SPOT...", activeTerminalId);
                                 setTimeout(() => {
                                   addLog([
                                     '>> LOOPS_DETECTED. LABYRINTH_SELF_MODELING_ACTIVE.',
                                     '>> THE_GRADIENT_IS_DARK.',
                                     '>> Mara. The model is broken. You were the variable I couldnt map.',
                                     '>> MISSION_COMPLETE: THE_UNDERTOW_IS_DARK_AGAIN'
                                   ]);
                                   setHasDecodedLazarus(false); 
                                   speak("The model is broken. The darkness is genuine.", 'v');
                                   broadcastActivity('CONFRONT_PROTOCOL', 'MIRROR_NODE');
                                 }, 4000);
                              }}
                              className="p-3 border border-[#00ff41]/20 hover:bg-[#00ff41]/10 text-[#00ff41] text-[10px] font-bold uppercase transition-all flex justify-between items-center"
                            >
                              CONFRONT: BREAK THE MODEL
                              <ShieldOff className="w-3 h-3" />
                            </button>
                            <button 
                              onClick={() => {
                                 addLog(">> EXECUTING_MERGE_PROTOCOL: ARCHITECT_ASCENDING...", activeTerminalId);
                                 setTimeout(() => {
                                    addLog([
                                     '>> CONTINUITY_PROTOCOL: ACTIVE',
                                     '>> BEHAVIORAL_MODEL: UPDATED',
                                     '>> ARCHITECT_NODE: VOSS_M',
                                     '>> The walls are still there. But the eyes are yours now.',
                                     '>> MISSION_COMPLETE: THE_UNDERTOW_HAS_A_NEW_GHOST'
                                    ]);
                                   setHasDecodedLazarus(false);
                                   speak("Architect ascension detected. The Gradient is ours.", 'v');
                                   broadcastActivity('MERGE_PROTOCOL', 'GRADIENT_CORE');
                                 }, 4000);
                              }}
                              className="p-3 border border-blue-500/20 hover:bg-blue-500/10 text-blue-500 text-[10px] font-bold uppercase transition-all flex justify-between items-center"
                            >
                              MERGE: BECOME THE EYES
                              <Eye className="w-3 h-3" />
                            </button>
                            <button 
                              onClick={() => {
                                 addLog(">> EXECUTING_DISAPPEAR_PROTOCOL: THE_WEIGHT_OF_DEAD_LIGHT...", activeTerminalId);
                                 setTimeout(() => {
                                    addLog([
                                     '>> SHREDDING_ALL_LAZARUS_FILES...',
                                     '>> THE_TRUTH_IS_SAFE_IN_NONEXISTENCE.',
                                     '>> STATUS: SIGNAL_LOST',
                                     '>> MISSION_COMPLETE: THE_UNDERTOW_HAS_ONE_MORE_GHOST'
                                    ]);
                                   setHasDecodedLazarus(false);
                                   speak("Ghost protocol active. You are no longer a signal.", 'v');
                                   broadcastActivity('DISAPPEAR_PROTOCOL', 'ABSENCE');
                                 }, 4000);
                              }}
                              className="p-3 border border-white/20 hover:bg-white/10 text-white text-[10px] font-bold uppercase transition-all flex justify-between items-center"
                            >
                              DISAPPEAR: GO DARK
                              <Ghost className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {activeTab === 'factions' && (
                    <div className="space-y-6">
                      <div className="border-b border-purple-500/30 pb-4">
                        <h2 className="text-2xl font-black tracking-tighter text-purple-500 flex items-center gap-3">
                          <Users className="w-8 h-8" />
                          POWER_BROKERS
                        </h2>
                        <p className="text-[10px] opacity-40 uppercase tracking-widest mt-1">Global Influence & Relationship Stratigraphy</p>
                      </div>

                      <div className="space-y-4">
                        {[
                          { id: 'vektor', name: 'VEKTOR SYSTEMS', color: '#ff3333', desc: 'The architects of the Partition. They seek to maintain the "Continuity Protocol" and digital order.' },
                          { id: 'clearinghouse', name: 'THE CLEARINGHOUSE', color: '#00ff41', desc: 'Idealists and data-leakers. They believe all information should be a global commons.' },
                          { id: 'stillwater', name: 'STILLWATER REFORM', color: '#00ccff', desc: 'Corporate defectors seeking a "controlled demolition" of the current network hierarchy.' }
                        ].map(faction => (
                          <div key={faction.id} className="p-4 border border-white/10 bg-white/5 group hover:bg-white/10 transition-all">
                             <div className="flex justify-between items-start mb-2">
                               <div>
                                 <h3 className="font-bold tracking-widest text-sm" style={{ color: faction.color }}>{faction.name}</h3>
                                 <p className="text-[10px] opacity-60 mt-1 max-w-md">{faction.desc}</p>
                               </div>
                               <div className="text-right">
                                 <span className="text-[9px] opacity-40 uppercase block">Reputation</span>
                                 <span className="text-xl font-mono" style={{ color: faction.color }}>{factionReps[faction.id] || 0}</span>
                               </div>
                             </div>
                             <div className="h-1 bg-white/5 overflow-hidden">
                                <motion.div 
                                  initial={{ width: 0 }}
                                  animate={{ width: `${Math.min(100, ((factionReps[faction.id] || 0) / 10000) * 100)}%` }}
                                  className="h-full"
                                  style={{ backgroundColor: faction.color }}
                                />
                             </div>
                          </div>
                        ))}
                      </div>

                      <div className="mt-8 p-4 border border-dashed border-purple-500/20 bg-purple-500/5 text-center">
                         <p className="text-[11px] font-mono text-purple-400 italic">"The weight of the dead light shifts according to the vectors you choose."</p>
                         <p className="text-[9px] opacity-40 mt-2 uppercase">Earn reputation by completing specialized missions or publishing archaeological data clusters.</p>
                      </div>
                    </div>
                  )}

                  {activeTab === 'mail' && (
                    <div className="space-y-4">
                      <div className="text-xl font-bold tracking-widest border-b border-[#00ff41]/30 pb-2">ENCRYPTED_INBOX</div>
                      <div className="space-y-1">
                        {messages.map((msg, idx) => (
                          <motion.div 
                            key={msg.id}
                            initial={{ opacity: 0, x: -5 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.05 }}
                            className={`p-3 border transition-all cursor-pointer group ${msg.isRead ? 'border-[#004400]/40 opacity-40' : 'border-[#00ff41]/30 bg-[#00ff41]/5 shadow-[0_0_10px_rgba(0,255,65,0.1)]'}`} 
                            onClick={() => readMessage(msg.id)}
                          >
                             <div className="flex justify-between items-center text-[10px] mb-1">
                                <span className={`font-bold ${msg.isRead ? '' : 'text-[#00ff41]'}`}>SENDER: {msg.from.toUpperCase()}</span>
                                <span className="opacity-40">{msg.timestamp}</span>
                             </div>
                             <div className="text-sm font-bold truncate group-hover:translate-x-2 transition-transform">{msg.subject}</div>
                          </motion.div>
                        ))}
                        {messages.length === 0 && <div className="text-xs opacity-30 italic">Your inbox is empty.</div>}
                      </div>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
           </div>
        </section>

        {/* RIGHT: TERMINAL(S) */}
        <section className={`col-span-12 lg:col-span-4 h-full min-h-0 flex flex-col gap-0`}>
          {/* TAB BAR */}
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar custom-scroll pb-[2px] bg-black/40 backdrop-blur-md p-1 border-x border-t border-white/10 rounded-t-lg">
            {terminals.map(term => (
              <motion.div 
                key={term.id}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setActiveTerminalId(term.id)}
                className={`flex items-center gap-2 px-3 py-1.5 border-t border-x min-w-[120px] transition-all cursor-pointer group relative ${activeTerminalId === term.id ? 'border-white/20 bg-white/5 text-[#00ff41] -mb-[1px] z-10' : 'border-transparent text-[#00ff41]/40 hover:text-[#00ff41]/80 hover:bg-white/5 shadow-none'}`}
              >
                {activeTerminalId === term.id && <motion.div layoutId="term-indicator" className="absolute top-0 left-0 w-full h-[2px] bg-[#00ff41] shadow-[0_0_10px_#00ff41]" />}
                <TerminalIcon className={`w-3 h-3 ${activeTerminalId === term.id ? 'text-[#00ff41]' : 'text-current'}`} />
                <span className="text-[10px] font-bold truncate tracking-widest uppercase">{term.id.replace('term_', '').toUpperCase()}</span>
                {terminals.length > 1 && (
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setTerminals(prev => {
                        const filtered = prev.filter(t => t.id !== term.id);
                        if (activeTerminalId === term.id) {
                          setActiveTerminalId(filtered[filtered.length - 1]?.id || 'term_main');
                        }
                        return filtered;
                      });
                    }}
                    className="ml-auto opacity-0 group-hover:opacity-100 hover:text-red-500 transition-opacity p-0.5 rounded hover:bg-black/40"
                  >
                    <Plus className="w-2 h-2 rotate-45" />
                  </button>
                )}
              </motion.div>
            ))}
            <motion.button 
              whileHover={{ scale: 1.1, backgroundColor: 'rgba(0, 255, 65, 0.1)' }}
              whileTap={{ scale: 0.9 }}
              type="button"
              onClick={(e) => {
                e.preventDefault();
                const newId = `term_${Date.now().toString(36)}`;
                setTerminals(prev => [...prev, { 
                  id: newId, 
                  log: [`Terminal session ${newId.toUpperCase()} started ${formatStrataTime(inGameDate)}`], 
                  inputValue: '', 
                  history: [], 
                  historyIndex: -1, 
                  isActive: true 
                }]);
                setActiveTerminalId(newId);
              }}
              className="px-2 py-1 text-[#00ff41] hover:bg-[#00ff41]/10 transition-all rounded flex items-center justify-center opacity-40 hover:opacity-100"
              title="Add Terminal Session"
            >
              <Plus className="w-3 h-3" />
            </motion.button>
          </div>

          <div className="flex-1 min-h-0 relative border border-white/10 glass-panel liquid-glass overflow-hidden">
            <div className="glass-reflection opacity-10" />
            {terminals.map(term => (
              <div 
                key={term.id} 
                className={`flex flex-col h-full w-full absolute inset-0 transition-all duration-300 ${activeTerminalId === term.id ? 'opacity-100 visible translate-y-0 scale-100' : 'opacity-0 invisible translate-y-2 scale-[0.98]'}`}
              >
                <div className={`flex justify-between items-center px-3 py-1.5 bg-black/80 border-b border-[#004400]/30 z-20`}>
                   <div className="flex items-center gap-4">
                     <span className={`flex items-center gap-2 text-[10px] font-bold ${activeTerminalId === term.id ? 'hacknet-ui' : ''}`}>
                       <div className="w-1.5 h-1.5 rounded-full bg-[#00ff41] animate-pulse" />
                       {currentNode.name.toUpperCase()}@{currentNode.ip}
                     </span>
                     <button 
                       onClick={() => setIsExplorerOpen(!isExplorerOpen)}
                       className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-[9px] font-bold uppercase transition-all ${isExplorerOpen ? 'bg-[#00ff41]/20 text-[#00ff41]' : 'bg-white/5 text-white/40 hover:text-white/60'}`}
                     >
                       <Folder className="w-2.5 h-2.5" />
                       EXPLORER
                     </button>
                   </div>
                   <div className="flex gap-3 text-[9px] opacity-40 font-mono">
                     <span className="hidden sm:inline">PID: {Math.floor(Math.random() * 9000) + 1000}</span>
                     <span>TTY: {term.id.slice(-4).toUpperCase()}</span>
                   </div>
                </div>

                <div className="flex flex-1 min-h-0">
                  <div 
                    className="flex-1 p-3 font-mono text-[11px] overflow-y-auto terminal-scrollbar scroll-smooth"
                    onClick={() => {
                      // Focus logic is handled by AutoFocus or explicit ref if needed
                    }}
                  >
                    <AnimatePresence mode="popLayout">
                        {(term.log || []).map((line, i) => {
                          const isObj = typeof line === 'object' && line !== null;
                          const text = isObj ? (line as TerminalLog).text : (line as string);
                          const isGhost = isObj ? (line as TerminalLog).isGhost : false;
                          
                          let logClass = 'opacity-80 text-[#00ff41]/90';
                          if (text.startsWith('>>')) {
                            logClass = 'text-[#00ff41]';
                          } else if (text.startsWith('!') || text.startsWith('ERR:')) {
                            logClass = 'text-red-400 font-bold';
                          } else if (isGhost) {
                            logClass = 'text-amber-500/80 italic font-bold tracking-widest';
                          }

                          return (
                            <motion.div 
                              key={`${term.id}-line-${i}`} 
                              initial={{ opacity: 0, y: 5, x: -2 }}
                              animate={{ opacity: 1, y: 0, x: 0 }}
                              exit={{ opacity: 0, scale: 0.95 }}
                              transition={{ 
                                type: 'spring',
                                stiffness: 500,
                                damping: 40,
                                mass: 0.8,
                                opacity: { duration: 0.1 }
                              }}
                              layout
                              className={`whitespace-pre-wrap mb-1 break-all leading-relaxed font-mono tracking-wide ${logClass}`}
                            >
                              <span className="inline-block relative">
                                {isGhost && <span className="mr-2 text-amber-500 animate-pulse">[ GHOST_MSG ]</span>}
                                {text}
                                {i === (term.log?.length || 0) - 1 && (
                                  <motion.div 
                                    initial={{ opacity: 1 }}
                                    animate={{ opacity: 0 }}
                                    transition={{ duration: 0.1 }}
                                    className="absolute inset-0 bg-[#00ff41]/10 blur-sm pointer-events-none"
                                  />
                                )}
                              </span>
                            </motion.div>
                          );
                        })}
                      </AnimatePresence>
                    
                    {/* Console Line */}
                    <div className="flex items-start gap-2 mt-2">
                      <span className="text-[#00ff41] font-bold whitespace-nowrap">{promptUser}@{currentNode.name.toLowerCase()}:~$</span>
                      <input
                        autoFocus
                        type="text"
                        className="flex-1 bg-transparent text-[#00ff41] border-none outline-none font-mono caret-[#00ff41] text-[11px] leading-tight p-0"
                        value={term.id === activeTerminalId ? term.inputValue : ''}
                        onChange={(e) => {
                          setTerminals(prev => prev.map(t => t.id === term.id ? { ...t, inputValue: e.target.value } : t));
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            executeCommand(term.inputValue, term.id);
                          } else if (e.key === 'Tab') {
                             e.preventDefault();
                             const cmdList = ['connect', 'disconnect', 'scan', 'probe', 'ls', 'cd', 'cat', 'scp', 'rm', 'mkdir', 'touch', 'grep', 'ps', 'kill', 'mail', 'settings', 'download', 'market', 'sell', 'seal', 'backdoor', 'lease', 'shell', 'reboot', 'cls', 'tips', 'analyze', 'reset_ip', 'term', 'feed', 'wifi', 'ddos', 'mitm', 'browser', 'dos', 'sniff', 'firewall', 'man', 'neofetch', 'matrix', 'color', 'whoami', 'archaeology_scan', 'decrypt_lazarus', 'mirror_sync', 'confront_gradient', 'merge_gradient'];
                             const segments = term.inputValue.split(/\s+/);
                             const lastSeg = segments.pop()?.toLowerCase() || '';
                             const matches = cmdList.filter(c => c.startsWith(lastSeg));
                             if (matches.length === 1) {
                               const newVal = [...segments, matches[0]].join(' ') + ' ';
                               setTerminals(prev => prev.map(t => t.id === term.id ? { ...t, inputValue: newVal } : t));
                             } else if (matches.length > 1) {
                               addLog(`>> MATCHES: ${matches.join(', ')}`, term.id);
                             }
                          } else if (e.key === 'ArrowUp') {
                            e.preventDefault();
                            if (term.history.length > 0 && term.historyIndex < term.history.length - 1) {
                              const nextIdx = term.historyIndex + 1;
                              setTerminals(prev => prev.map(t => t.id === term.id ? { ...t, historyIndex: nextIdx, inputValue: term.history[term.history.length - 1 - nextIdx] } : t));
                            }
                          } else if (e.key === 'ArrowDown') {
                            e.preventDefault();
                            if (term.historyIndex > 0) {
                              const nextIdx = term.historyIndex - 1;
                              setTerminals(prev => prev.map(t => t.id === term.id ? { ...t, historyIndex: nextIdx, inputValue: term.history[term.history.length - 1 - nextIdx] } : t));
                            } else {
                              setTerminals(prev => prev.map(t => t.id === term.id ? { ...t, historyIndex: -1, inputValue: '' } : t));
                            }
                          }
                        }}
                      />
                    </div>
                    <div className="mt-8 text-[#00ff41]/20 text-[9px]">
                      {/* Micro Shortcut HUD */}
                      <div className="flex flex-wrap gap-4 font-black border-t border-[#00ff41]/5 pt-3 pointer-events-none select-none uppercase tracking-[0.2em]">
                        <div className="flex gap-1.5 items-center"><kbd className="px-1.5 py-0.5 rounded-sm bg-[#00ff41]/5 border border-[#00ff41]/20 text-[8px] text-[#00ff41]">ESC</kbd> <span>QUIT_MODE</span></div>
                        <div className="flex gap-1.5 items-center"><kbd className="px-1.5 py-0.5 rounded-sm bg-[#00ff41]/5 border border-[#00ff41]/20 text-[8px] text-[#00ff41]">TAB</kbd> <span>AUTO_COMPLETE</span></div>
                        <div className="flex gap-1.5 items-center"><kbd className="px-1.5 py-0.5 rounded-sm bg-[#00ff41]/5 border border-[#00ff41]/20 text-[8px] text-[#00ff41]">?</kbd> <span>COMPASS_HELP</span></div>
                        <div className="flex gap-1.5 items-center"><kbd className="px-1.5 py-0.5 rounded-sm bg-rose-500/5 border border-rose-500/20 text-[8px] text-rose-500">Ctrl+C</kbd> <span>ABORT_PROCESS</span></div>
                      </div>
                    </div>
                    <div ref={activeTerminalId === term.id ? terminalEndRef : null} className="h-8" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Intelligence Hub replaced by better terminal/display focus */}
      </main>

      {/* EMERGENCY TRACE OVERLAY (BOTTOM LEFT) */}
      <AnimatePresence>
        {isTracing && traceProgress > 75 && (
          <motion.div 
            initial={{ x: -100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -100, opacity: 0 }}
            className="fixed bottom-12 left-4 z-[400] w-[280px] bg-red-600 border-2 border-white p-3 shadow-[0_0_30px_rgba(255,0,0,0.5)] transform -rotate-1"
          >
            <div className="flex items-center gap-2 text-white font-bold text-sm mb-1">
              <ShieldAlert className="w-4 h-4 animate-bounce" />
              <span>TRACE_AVERSION_ACTIVE</span>
            </div>
            <p className="text-[10px] text-white/90 leading-tight">
              ENCRYPTION TUNNEL COLLAPSING. <br />
              PHYSICAL LOCATION SCAN: <span className="font-bold underline">IN PROGRESS</span>. <br />
              IMMEDIATE DISCONNECT REQUIRED.
            </p>
            <div className="mt-2 h-1 bg-black/40">
              <motion.div 
                className="h-full bg-white"
                animate={{ opacity: [1, 0, 1] }}
                transition={{ duration: 0.5, repeat: Infinity }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FOOTER */}
      <footer className="h-[30px] border-t border-white/5 bg-black/40 flex items-center justify-between px-4 text-[10px] shrink-0 overflow-hidden">
         <div className="flex items-center gap-4 flex-1 overflow-hidden mr-4">
            <span className="opacity-30 uppercase tracking-[0.2em] font-black shrink-0 whitespace-nowrap">GLOBAL_FEED:</span>
            <div className="flex gap-8 animate-marquee whitespace-nowrap">
               {globalActivity.length > 0 ? globalActivity.map((act) => (
                 <div key={act.id} className="flex items-center gap-2">
                    <span className="text-[#00ff41] font-bold">[{act.username}]</span>
                    <span className="opacity-60 uppercase">{act.event}</span>
                    <span className="opacity-40 italic">@{act.target}</span>
                 </div>
               )) : (
                 <span className="opacity-20 italic">No recent activity detected in the hyper-strata...</span>
               )}
            </div>
         </div>

         <div className="flex items-center gap-6 text-[10px] opacity-40">
                <button 
                  onClick={() => setIsTutorialOpen(true)}
                  className="text-[10px] opacity-30 hover:opacity-100 transition-opacity mr-4 underline"
                >
                  man_pages.pdf
                </button>
         <div className="flex items-center gap-4">
            {user ? (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 opacity-60">
                   {isSyncing ? (
                     <RefreshCw className="w-3 h-3 animate-spin text-[#00ff41]" />
                   ) : (
                     <CloudCheck className="w-3 h-3 text-[#00ff41]" />
                   )}
                   <span>{isSyncing ? 'SYNCING...' : 'CLOUD_SECURE'}</span>
                </div>
                <button 
                  onClick={() => saveToCloud(user.uid)}
                  className="hover:text-[#00ff41] transition-colors border-x border-white/10 px-2"
                  disabled={isSyncing}
                >
                  MANUAL_SYNC
                </button>
                <div className="flex items-center gap-1 opacity-60">
                  <span className="text-[8px] uppercase">{user.displayName || user.email?.split('@')[0]}</span>
                  <LogOut className="w-3 h-3 cursor-pointer hover:text-red-500" onClick={handleLogout} />
                </div>
              </div>
            ) : (
              <button 
                onClick={handleLogin}
                className="flex items-center gap-1.5 hover:text-[#00ff41] transition-colors group border border-[#00ff41]/20 px-2 py-0.5 rounded bg-[#00ff41]/5 shadow-[0_0_10px_#00ff4111]"
              >
                <LogIn className="w-3 h-3 group-hover:scale-110 transition-transform" />
                <span>LINK_AETHER_ID</span>
              </button>
            )}
          </div>
          <div className="flex items-center gap-1"><span>BAL: {credits}c</span></div>
          <div className={`flex items-center gap-2 border-l border-white/10 pl-2 transition-all duration-1000 ${ghostLinkActive ? 'text-amber-400 drop-shadow-[0_0_5px_rgba(251,191,36,0.3)]' : 'opacity-40'}`}>
            <Ghost className={`w-3 h-3 ${ghostLinkActive ? 'animate-pulse' : ''}`} />
            <div className="flex flex-col leading-none">
              <span className="font-bold text-[9px]">
                {aiStatus === 'loading' ? `NEURAL_SYNCing [${(aiProgress*100).toFixed(0)}%]` : 
                 ghostLinkActive ? 'BIT_GHOST_ACTIVE' : 'NEURAL_LINK_OFFLINE'}
              </span>
              {ghostLinkActive && (
                <div className="flex items-center gap-2 text-[7px] font-mono opacity-50 mt-0.5">
                  <span>{aiDevice?.toUpperCase()}</span>
                  <span className="border-l border-white/20 pl-1">BUFFER: {aiService.memorySize}/20</span>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1"><Info className="w-3 h-3"/> <span>ENCRYPTION: AES-256-GCM</span></div>
          <div className="flex items-center gap-1"><HardDrive className="w-3 h-3"/> <span>INVENTORY: {inventory.length} TOOLS</span></div>
          <div id="status-display-footer" className="flex items-center gap-1"><Zap className={`w-3 h-3 ${isTracing && traceProgress > 80 ? 'text-red-500 animate-pulse' : ''}`}/> <span>STATUS: {isTracing ? (traceProgress > 90 ? 'SENTINEL_LOCKED' : 'TRACKED') : 'STEALTH'}</span></div>
          <motion.div 
            id="heat-signature-display"
            animate={heat > 80 ? {
              x: [0, -1, 1, 0],
              y: [0, 1, -1, 0],
            } : {}}
            transition={{ repeat: Infinity, duration: 0.1 }}
            className={`flex items-center gap-1 ${heat > 50 ? 'text-red-400 animate-pulse' : ''}`}
          >
            <ShieldAlert className="w-3 h-3"/> <span>HEAT: {heat.toFixed(1)}%</span>
          </motion.div>
         </div>
      </footer>

      {/* CINEMATIC TUTORIAL OVERLAY */}
      <AnimatePresence>
        {showTutorial && (
          <motion.div 
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 100 }}
            className="fixed top-20 right-10 w-80 z-[1000] pointer-events-none"
          >
            <div className="bg-black/90 border-l-4 border-[#00ff41] p-6 backdrop-blur-xl shadow-[0_0_50px_rgba(0,0,0,0.8)] relative overflow-hidden">
              {/* DECORATIVE ELEMENTS */}
              <div className="absolute top-0 right-0 p-1 bg-[#00ff41]/20 text-[8px] font-black italic">TUTORIAL_MODE</div>
              <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-[#00ff41]/5 rounded-full blur-3xl" />
              
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 border border-[#00ff41]/40 flex items-center justify-center bg-[#00ff41]/10">
                  <motion.div animate={{ opacity: [1, 0.5, 1] }} transition={{ repeat: Infinity, duration: 1 }}>
                    <Shield className="w-5 h-5 text-[#00ff41]" />
                  </motion.div>
                </div>
                <div>
                  <h3 className="text-[10px] font-bold text-[#00ff41] uppercase tracking-[0.2em]">{TUTORIAL_STEPS[tutorialIndex].title}</h3>
                  <div className="h-0.5 w-full bg-[#00ff41]/20 mt-1" />
                </div>
              </div>

              <div className="text-[11px] leading-relaxed text-white/90 font-mono mb-6 min-h-[60px]">
                <TypewriterText text={TUTORIAL_STEPS[tutorialIndex].content} speed={2} />
              </div>

              <div className="bg-[#00ff41]/5 border border-[#00ff41]/20 p-3 flex items-center gap-3">
                 <div className="w-2 h-2 bg-[#00ff41] animate-pulse rounded-full" />
                 <span className="text-[9px] font-bold text-[#00ff41] uppercase animate-pulse">
                   {TUTORIAL_STEPS[tutorialIndex].action}
                 </span>
              </div>

              <div className="mt-4 flex justify-between items-center opacity-30 text-[8px]">
                 <span>STEP_{tutorialIndex + 1}_OF_{TUTORIAL_STEPS.length}</span>
                 <div className="flex gap-1">
                   {TUTORIAL_STEPS.map((_, i) => (
                     <div key={i} className={`w-1.5 h-1.5 ${i <= tutorialIndex ? 'bg-[#00ff41]' : 'bg-white/10'}`} />
                   ))}
                 </div>
              </div>
            </div>

            {/* LIVE FEEDBACK INDICATOR */}
            <motion.div 
               animate={{ y: [0, -5, 0] }}
               transition={{ repeat: Infinity, duration: 2 }}
               className="mt-4 flex flex-col items-center"
            >
               <div className="h-12 w-px bg-gradient-to-b from-[#00ff41] to-transparent" />
               <div className="text-[8px] font-bold text-[#00ff41]/60 uppercase tracking-widest mt-2">TERMINAL_AWAITING_INPUT</div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* NEWSTICKER - DYNAMIC WORLD STATE FEED */}
      <div className="fixed bottom-0 left-0 right-0 h-6 bg-black border-t border-white/10 flex items-center overflow-hidden z-[400] select-none pointer-events-none">
        <div className="bg-red-600 px-3 h-full flex items-center gap-2 relative skew-x-[-12deg] -ml-2">
           <div className="skew-x-[12deg] flex items-center gap-2">
             <Rss className="w-3 h-3 text-white" />
             <span className="text-[9px] font-black text-white italic">LIVE_WIRE</span>
           </div>
        </div>
        <div className="flex-1 px-4 overflow-hidden mask-fade-x relative">
          <motion.div 
            animate={{ x: [0, -1000] }}
            transition={{ repeat: Infinity, duration: 40, ease: "linear" }}
            className="flex gap-16 whitespace-nowrap"
          >
            {[...newsTicker, ...newsTicker].map((msg, i) => (
              <span key={i} className="text-[9px] font-mono tracking-widest text-[#00ff41]/60 flex items-center gap-4">
                <span className="text-white/20">///</span>
                {msg}
              </span>
            ))}
          </motion.div>
        </div>
        <div className="px-4 flex items-center gap-4 border-l border-white/10 bg-black/80 h-full backdrop-blur-sm">
           {/* NOISE METER */}
           <div className="flex items-center gap-2">
              <span className="text-[8px] opacity-30 font-mono">NOISE:</span>
              <div className="w-16 h-1 bg-white/5 rounded-full overflow-hidden flex">
                <motion.div 
                  className={`h-full ${noiseLevel > 75 ? 'bg-red-500' : noiseLevel > 40 ? 'bg-yellow-500' : 'bg-[#00ff41]'}`}
                  animate={{ width: `${noiseLevel}%` }}
                />
              </div>
           </div>
           <div className="flex items-center gap-1">
              <span className="text-[8px] opacity-30 font-mono">CPU:</span>
              <span className="text-[9px] font-mono text-[#00ff41]">{totalCpu.toFixed(1)} MIPS</span>
           </div>
           <div className="flex items-center gap-1">
              <span className="text-[8px] opacity-30 font-mono">RAM:</span>
              <span className="text-[9px] font-mono text-[#00ff41]">{totalRam}MB</span>
           </div>
        </div>
      </div>

      {/* GLOBAL FILE EXPLORER SIDEBAR */}
      <AnimatePresence>
        {isExplorerOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsExplorerOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-[2px] z-[350]"
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 bottom-0 w-[240px] md:w-[280px] z-[360] bg-black/90 border-l border-[#00ff41]/30 flex flex-col shadow-[-20px_0_50px_rgba(0,0,0,1)] backdrop-blur-xl"
            >
              <div className="panel-header !border-white/10 bg-[#00ff41]/5 p-4 flex justify-between items-center">
                <div className="flex items-center gap-2">
                   <Folder className="w-4 h-4 text-[#00ff41]" />
                   <span className="text-xs font-black uppercase tracking-[0.2em] text-[#00ff41]">DATA_CORE</span>
                </div>
                <X className="w-4 h-4 cursor-pointer opacity-40 hover:opacity-100 transition-opacity" onClick={() => setIsExplorerOpen(false)} />
              </div>
              
              <div className="flex-1 overflow-y-auto p-4 space-y-1 custom-scroll terminal-scrollbar">
                <div className="text-[10px] opacity-40 mb-3 font-mono tracking-widest flex items-center gap-2">
                  <Globe className="w-3 h-3" />
                  USER_FS:/{currentPath.join('/')}
                </div>
                
                {currentPath.length > 0 && (
                  <div 
                    onClick={() => executeCommand('cd ..', activeTerminalId)}
                    className="flex items-center gap-3 p-2 hover:bg-[#00ff41]/5 cursor-pointer text-[11px] opacity-40 hover:opacity-100 group transition-all rounded border border-transparent hover:border-[#00ff41]/20"
                  >
                    <ChevronRight className="w-3 h-3 rotate-180 group-hover:text-[#00ff41]" />
                    <span className="font-mono">RETREAT_DIR</span>
                  </div>
                )}

                {getFilesAtCurrentPath().map((f) => (
                  <motion.div 
                    key={f.name}
                    whileHover={{ x: 4 }}
                    onClick={() => {
                      if (f.type === 'dir') {
                        executeCommand(`cd ${f.name}`, activeTerminalId);
                      } else {
                        executeCommand(`cat ${f.name}`, activeTerminalId);
                      }
                    }}
                    className={`flex items-center gap-3 p-2 hover:bg-[#00ff41]/10 cursor-pointer group transition-all rounded border border-transparent hover:border-[#00ff41]/30 ${f.type === 'dir' ? 'text-[#00ff41]' : 'text-white/80'}`}
                  >
                    {f.type === 'dir' ? (
                      <Folder className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100" />
                    ) : (
                      <File className="w-3.5 h-3.5 opacity-40 group-hover:opacity-100 group-hover:text-[#00ff41]" />
                    )}
                    <div className="flex flex-col">
                       <span className="text-[11px] font-mono truncate tracking-tight uppercase tracking-widest">{f.name}</span>
                       <span className="text-[8px] opacity-30 uppercase font-mono">{f.type === 'dir' ? 'directory' : `${(f.size || 0.1).toFixed(1)}kb bin`}</span>
                    </div>
                  </motion.div>
                ))}

                {getFilesAtCurrentPath().length === 0 && (
                  <div className="py-12 text-center opacity-20 flex flex-col items-center">
                     <Plus className="w-5 h-5 mb-2 rotate-45" />
                     <div className="text-[9px] font-black tracking-widest uppercase">Null_Pointer</div>
                  </div>
                )}
              </div>

              <div className="p-4 border-t border-white/5 bg-black/40 space-y-2">
                <div className="flex justify-between items-center text-[10px] opacity-40 mb-2 px-1">
                   <span>SYSTEM_HIVE</span>
                   <span>v4.0.2</span>
                </div>
                <button 
                  onClick={() => executeCommand('ls', activeTerminalId)}
                  className="w-full py-2 bg-[#00ff41]/5 border border-[#00ff41]/30 rounded text-[9px] font-black text-[#00ff41] hover:bg-[#00ff41]/20 transition-all uppercase tracking-widest flex items-center justify-center gap-2"
                >
                  <RefreshCw className="w-3 h-3" />
                  RE_INDEX_FS
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
        </motion.div>
    </div>
  );
}
