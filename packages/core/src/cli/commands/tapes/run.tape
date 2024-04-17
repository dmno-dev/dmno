# relative to /packages/docs-site
# since we will do the docgen from there
Source "../core/src/cli/commands/tapes/base.tape"

Output "./src/assets/tapes/run.gif"

Type "cd ../../example-repo/"
Enter
Sleep 500ms

Type "cat .dmno/config.mts"
Enter
Sleep 500ms

Type "pnpm exec dmno run -s root -- echo $SOME_MD5" 
Sleep 500ms

Enter
Sleep 5s

