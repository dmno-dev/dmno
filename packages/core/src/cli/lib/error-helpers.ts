import kleur from 'kleur';
import _ from 'lodash-es';

export function exitWithErrorMessage(title: string, more: string | Array<string>) {
  console.error('\n💥', kleur.red(title), '💥');

  if (more) {
    console.error();
    if (_.isArray(more)) {
      console.error(more.join('\n'));
    } else {
      console.error(more);
    }
    console.error();
  }
  process.exit(1);
}
