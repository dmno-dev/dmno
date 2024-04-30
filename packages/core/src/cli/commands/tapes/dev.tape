# relative to /packages/docs-site
# since we will do the docgen from there
Source "../core/src/cli/commands/tapes/base.tape"

Output "./src/assets/tapes/dev.gif"

Type "cd ../../example-repo/"
Enter
Sleep 500ms

Type "pnpm exec dmno dev" 
Sleep 500ms

## TODO EDIT CONFIG VIA VIM

Enter
Sleep 1000ms

Enter

Sleep 5s

