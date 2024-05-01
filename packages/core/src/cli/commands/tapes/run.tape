# relative to /packages/docs-site
# since we will do the docgen from there
Source "../core/src/cli/commands/tapes/base.tape"

Output "./src/assets/tapes/run.gif"

Type "pnpm exec dmno run -s root -- printenv SOME_MD5" 
Sleep 500ms

Enter
Sleep 5s

