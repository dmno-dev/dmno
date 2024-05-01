# relative to /packages/docs-site
# since we will do the docgen from there
Source "../core/src/cli/commands/tapes/base.tape"

Output "./src/assets/tapes/plugin.gif"

Type "pnpm exec dmno plugin" 
Sleep 500ms

Enter

Sleep 3s

Enter

Type "pnpm exec dmno plugin -p vault/prod upsert"

Enter 

Sleep 3s

Down 2
Sleep 500ms
Up 2

Sleep 2s

