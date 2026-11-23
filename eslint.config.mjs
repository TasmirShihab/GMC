import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTs from 'eslint-config-next/typescript'

const config = [
  ...nextVitals,
  ...nextTs,
  { ignores: ['.next/**', 'node_modules/**', '_archive/**', 'public/**', 'next-env.d.ts'] },
  {
    rules: {
      // R3F mutates three.js objects inside useFrame by design.
      'react-hooks/immutability': 'off',
    },
  },
]

export default config
