//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// BridgeReceiver
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const bridgeReceiverAbi = [
  { type: 'constructor', inputs: [], stateMutability: 'nonpayable' },
  { type: 'receive', stateMutability: 'payable' },
  {
    type: 'function',
    inputs: [
      { name: 'token', internalType: 'contract IERC20', type: 'address' },
    ],
    name: 'pull',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'ua',
    outputs: [{ name: '', internalType: 'address payable', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'error',
    inputs: [{ name: 'token', internalType: 'address', type: 'address' }],
    name: 'SafeERC20FailedOperation',
  },
] as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// UniversalAddress
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const universalAddressAbi = [
  { type: 'constructor', inputs: [], stateMutability: 'nonpayable' },
  { type: 'receive', stateMutability: 'payable' },
  {
    type: 'function',
    inputs: [{ name: '_routeHash', internalType: 'bytes32', type: 'bytes32' }],
    name: 'initialize',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'routeHash',
    outputs: [{ name: '', internalType: 'bytes32', type: 'bytes32' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      {
        name: 'route',
        internalType: 'struct UniversalAddressRoute',
        type: 'tuple',
        components: [
          { name: 'toChainId', internalType: 'uint256', type: 'uint256' },
          { name: 'toToken', internalType: 'contract IERC20', type: 'address' },
          { name: 'toAddress', internalType: 'address', type: 'address' },
          { name: 'refundAddress', internalType: 'address', type: 'address' },
          { name: 'escrow', internalType: 'address', type: 'address' },
        ],
      },
      {
        name: 'tokenAmount',
        internalType: 'struct TokenAmount',
        type: 'tuple',
        components: [
          { name: 'token', internalType: 'contract IERC20', type: 'address' },
          { name: 'amount', internalType: 'uint256', type: 'uint256' },
        ],
      },
      { name: 'recipient', internalType: 'address payable', type: 'address' },
    ],
    name: 'sendAmount',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'version',
        internalType: 'uint64',
        type: 'uint64',
        indexed: false,
      },
    ],
    name: 'Initialized',
  },
  { type: 'error', inputs: [], name: 'InvalidInitialization' },
  { type: 'error', inputs: [], name: 'NotInitializing' },
  { type: 'error', inputs: [], name: 'ReentrancyGuardReentrantCall' },
  {
    type: 'error',
    inputs: [{ name: 'token', internalType: 'address', type: 'address' }],
    name: 'SafeERC20FailedOperation',
  },
] as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// UniversalAddressBridger
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const universalAddressBridgerAbi = [
  {
    type: 'constructor',
    inputs: [
      { name: 'toChainIds', internalType: 'uint256[]', type: 'uint256[]' },
      {
        name: 'bridgers',
        internalType: 'contract IDaimoPayBridger[]',
        type: 'address[]',
      },
      { name: 'stableOut', internalType: 'address[]', type: 'address[]' },
    ],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: 'chainId', internalType: 'uint256', type: 'uint256' }],
    name: 'chainIdToBridger',
    outputs: [
      {
        name: 'adapter',
        internalType: 'contract IDaimoPayBridger',
        type: 'address',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'chainId', internalType: 'uint256', type: 'uint256' }],
    name: 'chainIdToStableOut',
    outputs: [{ name: 'stableOut', internalType: 'address', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'toChainId', internalType: 'uint256', type: 'uint256' },
      {
        name: 'bridgeTokenOut',
        internalType: 'struct TokenAmount',
        type: 'tuple',
        components: [
          { name: 'token', internalType: 'contract IERC20', type: 'address' },
          { name: 'amount', internalType: 'uint256', type: 'uint256' },
        ],
      },
    ],
    name: 'getBridgeTokenIn',
    outputs: [
      { name: 'bridgeTokenIn', internalType: 'address', type: 'address' },
      { name: 'inAmount', internalType: 'uint256', type: 'uint256' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'toChainId', internalType: 'uint256', type: 'uint256' },
      { name: 'toAddress', internalType: 'address', type: 'address' },
      {
        name: 'bridgeTokenOut',
        internalType: 'struct TokenAmount',
        type: 'tuple',
        components: [
          { name: 'token', internalType: 'contract IERC20', type: 'address' },
          { name: 'amount', internalType: 'uint256', type: 'uint256' },
        ],
      },
      { name: 'extraData', internalType: 'bytes', type: 'bytes' },
    ],
    name: 'sendToChain',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'error',
    inputs: [{ name: 'token', internalType: 'address', type: 'address' }],
    name: 'SafeERC20FailedOperation',
  },
] as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// UniversalAddressFactory
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const universalAddressFactoryAbi = [
  { type: 'constructor', inputs: [], stateMutability: 'nonpayable' },
  {
    type: 'function',
    inputs: [
      {
        name: 'route',
        internalType: 'struct UniversalAddressRoute',
        type: 'tuple',
        components: [
          { name: 'toChainId', internalType: 'uint256', type: 'uint256' },
          { name: 'toToken', internalType: 'contract IERC20', type: 'address' },
          { name: 'toAddress', internalType: 'address', type: 'address' },
          { name: 'refundAddress', internalType: 'address', type: 'address' },
          { name: 'escrow', internalType: 'address', type: 'address' },
        ],
      },
    ],
    name: 'createUniversalAddress',
    outputs: [
      {
        name: 'ret',
        internalType: 'contract UniversalAddress',
        type: 'address',
      },
    ],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      {
        name: 'route',
        internalType: 'struct UniversalAddressRoute',
        type: 'tuple',
        components: [
          { name: 'toChainId', internalType: 'uint256', type: 'uint256' },
          { name: 'toToken', internalType: 'contract IERC20', type: 'address' },
          { name: 'toAddress', internalType: 'address', type: 'address' },
          { name: 'refundAddress', internalType: 'address', type: 'address' },
          { name: 'escrow', internalType: 'address', type: 'address' },
        ],
      },
    ],
    name: 'getUniversalAddress',
    outputs: [{ name: '', internalType: 'address', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'universalAddressImpl',
    outputs: [
      { name: '', internalType: 'contract UniversalAddress', type: 'address' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'universalAddress',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'route',
        internalType: 'struct UniversalAddressRoute',
        type: 'tuple',
        components: [
          { name: 'toChainId', internalType: 'uint256', type: 'uint256' },
          { name: 'toToken', internalType: 'contract IERC20', type: 'address' },
          { name: 'toAddress', internalType: 'address', type: 'address' },
          { name: 'refundAddress', internalType: 'address', type: 'address' },
          { name: 'escrow', internalType: 'address', type: 'address' },
        ],
        indexed: false,
      },
    ],
    name: 'UniversalAddressDeployed',
  },
] as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// UniversalAddressManager
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const universalAddressManagerAbi = [
  { type: 'constructor', inputs: [], stateMutability: 'nonpayable' },
  { type: 'receive', stateMutability: 'payable' },
  {
    type: 'function',
    inputs: [],
    name: 'ADDR_MAX',
    outputs: [{ name: '', internalType: 'address', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'MIN_START_TOKEN_OUT_KEY',
    outputs: [{ name: '', internalType: 'bytes32', type: 'bytes32' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'TOKEN_OUT_DECIMALS',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'UPGRADE_INTERFACE_VERSION',
    outputs: [{ name: '', internalType: 'string', type: 'string' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'bridger',
    outputs: [
      {
        name: '',
        internalType: 'contract IUniversalAddressBridger',
        type: 'address',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'cfg',
    outputs: [
      { name: '', internalType: 'contract SharedConfig', type: 'address' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      {
        name: 'route',
        internalType: 'struct UniversalAddressRoute',
        type: 'tuple',
        components: [
          { name: 'toChainId', internalType: 'uint256', type: 'uint256' },
          { name: 'toToken', internalType: 'contract IERC20', type: 'address' },
          { name: 'toAddress', internalType: 'address', type: 'address' },
          { name: 'refundAddress', internalType: 'address', type: 'address' },
          { name: 'escrow', internalType: 'address', type: 'address' },
        ],
      },
      {
        name: 'calls',
        internalType: 'struct Call[]',
        type: 'tuple[]',
        components: [
          { name: 'to', internalType: 'address', type: 'address' },
          { name: 'value', internalType: 'uint256', type: 'uint256' },
          { name: 'data', internalType: 'bytes', type: 'bytes' },
        ],
      },
      {
        name: 'bridgeTokenOut',
        internalType: 'struct TokenAmount',
        type: 'tuple',
        components: [
          { name: 'token', internalType: 'contract IERC20', type: 'address' },
          { name: 'amount', internalType: 'uint256', type: 'uint256' },
        ],
      },
      { name: 'relaySalt', internalType: 'bytes32', type: 'bytes32' },
      { name: 'sourceChainId', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'claimIntent',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      {
        name: 'intent',
        internalType: 'struct UABridgeIntent',
        type: 'tuple',
        components: [
          {
            name: 'universalAddress',
            internalType: 'address',
            type: 'address',
          },
          { name: 'relaySalt', internalType: 'bytes32', type: 'bytes32' },
          { name: 'bridgeAmountOut', internalType: 'uint256', type: 'uint256' },
          {
            name: 'bridgeToken',
            internalType: 'contract IERC20',
            type: 'address',
          },
          { name: 'sourceChainId', internalType: 'uint256', type: 'uint256' },
        ],
      },
    ],
    name: 'computeReceiverAddress',
    outputs: [
      { name: 'addr', internalType: 'address payable', type: 'address' },
      { name: 'recvSalt', internalType: 'bytes32', type: 'bytes32' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'executor',
    outputs: [
      { name: '', internalType: 'contract DaimoPayExecutor', type: 'address' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      {
        name: 'route',
        internalType: 'struct UniversalAddressRoute',
        type: 'tuple',
        components: [
          { name: 'toChainId', internalType: 'uint256', type: 'uint256' },
          { name: 'toToken', internalType: 'contract IERC20', type: 'address' },
          { name: 'toAddress', internalType: 'address', type: 'address' },
          { name: 'refundAddress', internalType: 'address', type: 'address' },
          { name: 'escrow', internalType: 'address', type: 'address' },
        ],
      },
      {
        name: 'calls',
        internalType: 'struct Call[]',
        type: 'tuple[]',
        components: [
          { name: 'to', internalType: 'address', type: 'address' },
          { name: 'value', internalType: 'uint256', type: 'uint256' },
          { name: 'data', internalType: 'bytes', type: 'bytes' },
        ],
      },
      { name: 'token', internalType: 'contract IERC20', type: 'address' },
      {
        name: 'bridgeTokenOut',
        internalType: 'struct TokenAmount',
        type: 'tuple',
        components: [
          { name: 'token', internalType: 'contract IERC20', type: 'address' },
          { name: 'amount', internalType: 'uint256', type: 'uint256' },
        ],
      },
      { name: 'relaySalt', internalType: 'bytes32', type: 'bytes32' },
      { name: 'sourceChainId', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'fastFinishIntent',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      {
        name: '_universalAddressFactory',
        internalType: 'contract UniversalAddressFactory',
        type: 'address',
      },
      {
        name: '_bridger',
        internalType: 'contract IUniversalAddressBridger',
        type: 'address',
      },
      { name: '_cfg', internalType: 'contract SharedConfig', type: 'address' },
    ],
    name: 'initialize',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'owner',
    outputs: [{ name: '', internalType: 'address', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'proxiableUUID',
    outputs: [{ name: '', internalType: 'bytes32', type: 'bytes32' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'receiver', internalType: 'address', type: 'address' }],
    name: 'receiverToRecipient',
    outputs: [{ name: 'recipient', internalType: 'address', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'receiver', internalType: 'address', type: 'address' }],
    name: 'receiverUsed',
    outputs: [{ name: 'used', internalType: 'bool', type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      {
        name: 'route',
        internalType: 'struct UniversalAddressRoute',
        type: 'tuple',
        components: [
          { name: 'toChainId', internalType: 'uint256', type: 'uint256' },
          { name: 'toToken', internalType: 'contract IERC20', type: 'address' },
          { name: 'toAddress', internalType: 'address', type: 'address' },
          { name: 'refundAddress', internalType: 'address', type: 'address' },
          { name: 'escrow', internalType: 'address', type: 'address' },
        ],
      },
      { name: 'token', internalType: 'contract IERC20', type: 'address' },
    ],
    name: 'refundIntent',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'renounceOwnership',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      {
        name: 'route',
        internalType: 'struct UniversalAddressRoute',
        type: 'tuple',
        components: [
          { name: 'toChainId', internalType: 'uint256', type: 'uint256' },
          { name: 'toToken', internalType: 'contract IERC20', type: 'address' },
          { name: 'toAddress', internalType: 'address', type: 'address' },
          { name: 'refundAddress', internalType: 'address', type: 'address' },
          { name: 'escrow', internalType: 'address', type: 'address' },
        ],
      },
      {
        name: 'paymentToken',
        internalType: 'contract IERC20',
        type: 'address',
      },
      { name: 'toAmount', internalType: 'uint256', type: 'uint256' },
      {
        name: 'calls',
        internalType: 'struct Call[]',
        type: 'tuple[]',
        components: [
          { name: 'to', internalType: 'address', type: 'address' },
          { name: 'value', internalType: 'uint256', type: 'uint256' },
          { name: 'data', internalType: 'bytes', type: 'bytes' },
        ],
      },
    ],
    name: 'sameChainFinishIntent',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      {
        name: 'route',
        internalType: 'struct UniversalAddressRoute',
        type: 'tuple',
        components: [
          { name: 'toChainId', internalType: 'uint256', type: 'uint256' },
          { name: 'toToken', internalType: 'contract IERC20', type: 'address' },
          { name: 'toAddress', internalType: 'address', type: 'address' },
          { name: 'refundAddress', internalType: 'address', type: 'address' },
          { name: 'escrow', internalType: 'address', type: 'address' },
        ],
      },
      {
        name: 'paymentToken',
        internalType: 'contract IERC20',
        type: 'address',
      },
      {
        name: 'bridgeTokenOut',
        internalType: 'struct TokenAmount',
        type: 'tuple',
        components: [
          { name: 'token', internalType: 'contract IERC20', type: 'address' },
          { name: 'amount', internalType: 'uint256', type: 'uint256' },
        ],
      },
      { name: 'relaySalt', internalType: 'bytes32', type: 'bytes32' },
      {
        name: 'calls',
        internalType: 'struct Call[]',
        type: 'tuple[]',
        components: [
          { name: 'to', internalType: 'address', type: 'address' },
          { name: 'value', internalType: 'uint256', type: 'uint256' },
          { name: 'data', internalType: 'bytes', type: 'bytes' },
        ],
      },
      { name: 'bridgeExtraData', internalType: 'bytes', type: 'bytes' },
    ],
    name: 'startIntent',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: 'newOwner', internalType: 'address', type: 'address' }],
    name: 'transferOwnership',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'universalAddressFactory',
    outputs: [
      {
        name: '',
        internalType: 'contract UniversalAddressFactory',
        type: 'address',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'newImplementation', internalType: 'address', type: 'address' },
      { name: 'data', internalType: 'bytes', type: 'bytes' },
    ],
    name: 'upgradeToAndCall',
    outputs: [],
    stateMutability: 'payable',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'universalAddress',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'receiverAddress',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'finalRecipient',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'route',
        internalType: 'struct UniversalAddressRoute',
        type: 'tuple',
        components: [
          { name: 'toChainId', internalType: 'uint256', type: 'uint256' },
          { name: 'toToken', internalType: 'contract IERC20', type: 'address' },
          { name: 'toAddress', internalType: 'address', type: 'address' },
          { name: 'refundAddress', internalType: 'address', type: 'address' },
          { name: 'escrow', internalType: 'address', type: 'address' },
        ],
        indexed: false,
      },
      {
        name: 'intent',
        internalType: 'struct UABridgeIntent',
        type: 'tuple',
        components: [
          {
            name: 'universalAddress',
            internalType: 'address',
            type: 'address',
          },
          { name: 'relaySalt', internalType: 'bytes32', type: 'bytes32' },
          { name: 'bridgeAmountOut', internalType: 'uint256', type: 'uint256' },
          {
            name: 'bridgeToken',
            internalType: 'contract IERC20',
            type: 'address',
          },
          { name: 'sourceChainId', internalType: 'uint256', type: 'uint256' },
        ],
        indexed: false,
      },
    ],
    name: 'Claim',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'universalAddress',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'receiverAddress',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'newRecipient',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'route',
        internalType: 'struct UniversalAddressRoute',
        type: 'tuple',
        components: [
          { name: 'toChainId', internalType: 'uint256', type: 'uint256' },
          { name: 'toToken', internalType: 'contract IERC20', type: 'address' },
          { name: 'toAddress', internalType: 'address', type: 'address' },
          { name: 'refundAddress', internalType: 'address', type: 'address' },
          { name: 'escrow', internalType: 'address', type: 'address' },
        ],
        indexed: false,
      },
      {
        name: 'intent',
        internalType: 'struct UABridgeIntent',
        type: 'tuple',
        components: [
          {
            name: 'universalAddress',
            internalType: 'address',
            type: 'address',
          },
          { name: 'relaySalt', internalType: 'bytes32', type: 'bytes32' },
          { name: 'bridgeAmountOut', internalType: 'uint256', type: 'uint256' },
          {
            name: 'bridgeToken',
            internalType: 'contract IERC20',
            type: 'address',
          },
          { name: 'sourceChainId', internalType: 'uint256', type: 'uint256' },
        ],
        indexed: false,
      },
    ],
    name: 'FastFinish',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'version',
        internalType: 'uint64',
        type: 'uint64',
        indexed: false,
      },
    ],
    name: 'Initialized',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'previousOwner',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'newOwner',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
    ],
    name: 'OwnershipTransferred',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'universalAddress',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'route',
        internalType: 'struct UniversalAddressRoute',
        type: 'tuple',
        components: [
          { name: 'toChainId', internalType: 'uint256', type: 'uint256' },
          { name: 'toToken', internalType: 'contract IERC20', type: 'address' },
          { name: 'toAddress', internalType: 'address', type: 'address' },
          { name: 'refundAddress', internalType: 'address', type: 'address' },
          { name: 'escrow', internalType: 'address', type: 'address' },
        ],
        indexed: false,
      },
      {
        name: 'refundToken',
        internalType: 'address',
        type: 'address',
        indexed: false,
      },
      {
        name: 'refundAmount',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
    ],
    name: 'Refund',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'universalAddress',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'route',
        internalType: 'struct UniversalAddressRoute',
        type: 'tuple',
        components: [
          { name: 'toChainId', internalType: 'uint256', type: 'uint256' },
          { name: 'toToken', internalType: 'contract IERC20', type: 'address' },
          { name: 'toAddress', internalType: 'address', type: 'address' },
          { name: 'refundAddress', internalType: 'address', type: 'address' },
          { name: 'escrow', internalType: 'address', type: 'address' },
        ],
        indexed: false,
      },
      {
        name: 'paymentToken',
        internalType: 'address',
        type: 'address',
        indexed: false,
      },
      {
        name: 'paymentAmount',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      {
        name: 'toAmount',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
    ],
    name: 'SameChainFinish',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'universalAddress',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'receiverAddress',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'route',
        internalType: 'struct UniversalAddressRoute',
        type: 'tuple',
        components: [
          { name: 'toChainId', internalType: 'uint256', type: 'uint256' },
          { name: 'toToken', internalType: 'contract IERC20', type: 'address' },
          { name: 'toAddress', internalType: 'address', type: 'address' },
          { name: 'refundAddress', internalType: 'address', type: 'address' },
          { name: 'escrow', internalType: 'address', type: 'address' },
        ],
        indexed: false,
      },
      {
        name: 'intent',
        internalType: 'struct UABridgeIntent',
        type: 'tuple',
        components: [
          {
            name: 'universalAddress',
            internalType: 'address',
            type: 'address',
          },
          { name: 'relaySalt', internalType: 'bytes32', type: 'bytes32' },
          { name: 'bridgeAmountOut', internalType: 'uint256', type: 'uint256' },
          {
            name: 'bridgeToken',
            internalType: 'contract IERC20',
            type: 'address',
          },
          { name: 'sourceChainId', internalType: 'uint256', type: 'uint256' },
        ],
        indexed: false,
      },
      {
        name: 'paymentToken',
        internalType: 'address',
        type: 'address',
        indexed: false,
      },
      {
        name: 'paymentAmount',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
    ],
    name: 'Start',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'implementation',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
    ],
    name: 'Upgraded',
  },
  {
    type: 'error',
    inputs: [{ name: 'target', internalType: 'address', type: 'address' }],
    name: 'AddressEmptyCode',
  },
  {
    type: 'error',
    inputs: [
      { name: 'implementation', internalType: 'address', type: 'address' },
    ],
    name: 'ERC1967InvalidImplementation',
  },
  { type: 'error', inputs: [], name: 'ERC1967NonPayable' },
  { type: 'error', inputs: [], name: 'FailedCall' },
  { type: 'error', inputs: [], name: 'InvalidInitialization' },
  { type: 'error', inputs: [], name: 'NotInitializing' },
  {
    type: 'error',
    inputs: [{ name: 'owner', internalType: 'address', type: 'address' }],
    name: 'OwnableInvalidOwner',
  },
  {
    type: 'error',
    inputs: [{ name: 'account', internalType: 'address', type: 'address' }],
    name: 'OwnableUnauthorizedAccount',
  },
  { type: 'error', inputs: [], name: 'ReentrancyGuardReentrantCall' },
  {
    type: 'error',
    inputs: [{ name: 'token', internalType: 'address', type: 'address' }],
    name: 'SafeERC20FailedOperation',
  },
  { type: 'error', inputs: [], name: 'UUPSUnauthorizedCallContext' },
  {
    type: 'error',
    inputs: [{ name: 'slot', internalType: 'bytes32', type: 'bytes32' }],
    name: 'UUPSUnsupportedProxiableUUID',
  },
] as const
