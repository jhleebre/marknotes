import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

const rendererAlias = {
  '@renderer': resolve(__dirname, 'src/renderer/src')
}

export default defineConfig({
  test: {
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      reportsDirectory: './tests/coverage',
      include: [
        'src/main/utils.ts',
        'src/main/services/fileOperations.ts',
        'src/main/services/searchService.ts',
        'src/renderer/src/store/useDocumentStore.ts',
        'src/renderer/src/components/Editor/markdown/**/*.ts',
        'src/renderer/src/utils/frontmatter.ts'
      ],
      exclude: ['node_modules', 'tests', 'out', 'dist', 'build']
    },
    projects: [
      {
        // Main 프로세스: Node.js 환경
        test: {
          name: 'unit:main',
          environment: 'node',
          include: ['tests/unit/main/**/*.test.ts'],
          setupFiles: ['tests/setup/setup.main.ts'],
          globals: true
        }
      },
      {
        // Renderer 프로세스: jsdom 환경
        resolve: { alias: rendererAlias },
        test: {
          name: 'unit:renderer',
          environment: 'jsdom',
          include: ['tests/unit/renderer/**/*.test.ts'],
          setupFiles: ['tests/setup/setup.renderer.ts'],
          globals: true
        }
      }
    ]
  }
})
