# relative to /packages/docs-site
# since we will do the docgen from there
Source "../core/src/cli/commands/tapes/base.tape"

Output "./src/assets/tapes/clear-cache.gif"

# TODO show a cached value

Type "pnpm exec dmno load -s root" 
Enter
Sleep 4000ms

Type "pnpm exec dmno clear-cache" 
Enter
Sleep 5000ms

# TODO show the cache is cleared and value is new


