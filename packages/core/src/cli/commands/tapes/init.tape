# relative to /packages/docs-site
# since we will do the docgen from there
Source "../core/src/cli/commands/tapes/base.tape"

Output "./src/assets/tapes/init.gif"

Type "pnpm exec dmno init" 
Sleep 500ms

Enter

Sleep 2000ms

Down 2
Sleep 1000ms
Up 2
Sleep 1000ms

Sleep 5s

