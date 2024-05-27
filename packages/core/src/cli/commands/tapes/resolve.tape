# relative to /packages/docs-site
# since we will do the docgen from there
Source "../core/src/cli/commands/tapes/base.tape"

Output "./src/assets/tapes/resolve.gif"

Type "cat .dmno/config.mts"
Enter
Sleep 500ms

Type "pnpm exec dmno resolve -s root" 
Sleep 500ms

Enter
Sleep 5s

