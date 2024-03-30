import fs from 'node:fs';
import _ from 'lodash-es';
import { optimize } from 'svgo';
import {
  DmnoConfigItemBase, DmnoService,
} from './config-engine';
import { DmnoBaseTypes } from './base-types';


const AUTOGENERATED_FILE_BANNER = `
// 🛑 🛑 🛑 🛑 🛑 🛑 🛑 🛑 🛑 🛑 🛑 🛑 🛑 🛑 🛑 🛑 🛑 🛑 🛑 🛑 🛑 🛑
// 🛑 THIS IS AN AUTOGENERATED FILE - DO NOT EDIT DIRECTLY 🛑
// 🛑 🛑 🛑 🛑 🛑 🛑 🛑 🛑 🛑 🛑 🛑 🛑 🛑 🛑 🛑 🛑 🛑 🛑 🛑 🛑 🛑 🛑

`;

export async function generateServiceTypes(service: DmnoService, writeToFile = false) {
  if (!service.isValid) return;
  // TODO: this could switch between different type gen methods
  const dtsSrc = await generateTypescriptTypes(service);



  if (writeToFile) {
    const typeGenFolderPath = `${service.path}/.dmno/.typegen`;
    await fs.promises.mkdir(typeGenFolderPath, { recursive: true });

    // write schema.ts which has the config schema turned into TS in it
    await fs.promises.writeFile(`${typeGenFolderPath}/schema.ts`, dtsSrc, 'utf-8');

    // write global file which defines a DMNO_CONFIG global
    // this used in our config.mts files and in front-end apps where we inject rollup rewrites
    await fs.promises.writeFile(`${typeGenFolderPath}/global.d.ts`, `${AUTOGENERATED_FILE_BANNER}
import { DmnoGeneratedConfigSchema } from './schema';

declare global {
  /** ${service.serviceName} config global obj */
  const DMNO_CONFIG: DmnoGeneratedConfigSchema;
}
`, 'utf-8');

    await fs.promises.writeFile(`${typeGenFolderPath}/node.d.ts`, `${AUTOGENERATED_FILE_BANNER}
import { DmnoGeneratedConfigSchema } from './schema';

declare global {
  namespace NodeJS {
    
    // this adds a _new_ \`process.dmnoEnv\` global
    interface Process {
      dmnoEnv: DmnoGeneratedConfigSchema;
    }
    
    // this add our generated schema to \`process.env\`
    // interface ProcessEnv extends DmnoGeneratedConfigSchema {}
  }
}
`, 'utf-8');
  }
}

const ICON_SIZE = 20;

async function fetchIconSvg(
  iconifyName: string,
  color = '808080', // neutral gray that should appear on black or white bg
  iconCacheFolder = '/tmp/dmno-icon-cache', // TODO: maybe move icon cache to root dmno folder?
) {
  // some notes about icons
  // - using a URL that points to an svg doesn't work (but png/jpg do work)
  // - but embedding data url with an svg works fine
  // - we are fetching them on demand and caching them
  // - and then applying a color if one is set or falling back to a neutral gray that should show up on either black or white

  fs.mkdirSync(iconCacheFolder, { recursive: true });

  const iconPath = `${iconCacheFolder}/${iconifyName}-${ICON_SIZE}.svg`;

  let svgSrc: string;
  if (fs.existsSync(iconPath)) {
    const svgFileBuffer = await fs.promises.readFile(iconPath, 'utf-8');
    svgSrc = svgFileBuffer.toString();
  } else {
    const iconSvg = await fetch(`https://api.iconify.design/${iconifyName.replace(':', '/')}.svg?height=${ICON_SIZE}`);
    svgSrc = await iconSvg.text();

    // run it through svgo to try to shrink it down a little
    const optimizedSvgResult = optimize(svgSrc, {
      multipass: true,
    });

    await fs.promises.writeFile(iconPath, optimizedSvgResult.data, 'utf-8');
  }

  const hexColor = color.startsWith('#') ? color : `#${color}`;

  const colorizedSvg = svgSrc.replaceAll('currentColor', hexColor);

  return colorizedSvg;
}

export async function generateTypescriptTypes(service: DmnoService) {
  const tsSrc = [
    AUTOGENERATED_FILE_BANNER,
    'export type DmnoGeneratedConfigSchema = {',
  ];
  for (const itemKey in service.config) {
    const configItem = service.config[itemKey];
    tsSrc.push(...await getTsDefinitionForItem(configItem, 1));
  }
  tsSrc.push('}');

  return tsSrc.join('\n');
}


// const dmnoLogoSvg = encodeURIComponent('<svg height="12" viewBox="0 0 12 12" width="12" xmlns="http://www.w3.org/2000/svg"><path d="m10 6c0 2.20914-1.79086 4-4 4-.00098 0-.00196 0-.00294 0h-3.99706v-8h4c2.20914 0 4 1.79086 4 4z" fill="#808080"/></svg>');

async function getTsDefinitionForItem(item: DmnoConfigItemBase, indentLevel = 0) {
  const i = _.times(indentLevel, () => '  ').join('');
  const itemSrc = [];

  // TODO - we are assuming here that the config has been fully resolved
  // meaning if we had settings varying based on values (ex: something is required only for prod) then this wouldn't work
  // so we'll need to add a concept of fully resolving the config and triggering that first
  // also begs the question of what the types look like when the schema can vary like that...

  // TODO: also will need to figure out how we deal with null values
  // since we might need something like `key: string | null` rather than `key?: string`

  const jsDocLines = [];
  const itemType = item.type;
  let iconMd = '';

  const iconCachePath = `${item.parentService?.workspace.rootService.path}/.dmno/.icon-cache`;

  if (itemType.getDefItem('ui')?.icon) {
    const iconSvg = await fetchIconSvg(itemType.getDefItem('ui')?.icon!, itemType.getDefItem('ui')?.color, iconCachePath);

    if (iconSvg) {
      iconMd = `![icon](data:image/svg+xml;utf-8,${encodeURIComponent(iconSvg)}) `;
    }
  }



  const label = itemType.getDefItem('summary') || item.key;


  jsDocLines.push(`**${label}**${itemType.getDefItem('secret') ? ' 🔐 _secret_' : ''}`);

  if (itemType.getDefItem('description')) {
    jsDocLines.push(itemType.getDefItem('description'));
  }
  if (itemType.getDefItem('typeDescription')) {
    jsDocLines.push(`_${itemType.getDefItem('typeDescription')}_`);
  }


  if (iconMd) {
    jsDocLines.push(iconMd);
  }

  if (itemType.getDefItem('externalDocs')) {
    const externalDocs = itemType.getDefItem('externalDocs')!;
    // see https://jsdoc.app/tags-see for format info
    const docsLink = _.compact([externalDocs.url, externalDocs.description]).join(' | ');
    jsDocLines.push(`📚 {@link ${docsLink}}`);
  }



  // experimenting with a dmno branded stamp w/ link? probably too much, but it's fun!
  if (jsDocLines.length > 1) {
    // any text is turned blue
    // jsDocLines.push('{: style="text-align: right" }[●](https://dmno.dev)');

    // "generated by DMNO"
    // jsDocLines.push('[![](data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGkAAAAKCAYAAAC34nDOAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAIdSURBVHgB7VbRccIwDBW9/pcNmk7QbNB0AtiAMEFhAsIEdIPQCUo3gAkIG2SEdIJWL3k+1BSSEOBa7nh3Psfyk2RLsh2RK/49OnKFRFH0tUO80DbWufRQHrmedrE2X1v3GN6N/CG4wKbcQFu/Yi6S0wK+1g3W+IvH77W2QIrAH8W7NQpdkjG51HFCma/90hjNrIxyVEHmso+gaZfQVi4np1uyFWs/1T41umVevgbaqoRdB+wbm165ghsCvlHlzwfyZrIN+tG8/CQxYFBAAh6ZIMgizr9TGeNQGzb9yjnogRsyOYBPe+AGJtDgx2YhmV2ZzoXUQRGMKJ6Q60k1nsiJ6c+uZybt4bfg9U/JuzGCFavXZRZBQhC9kvJCG3h3HAeyDbhzilO0kSKpC7WbyTbQuX0Ugnaf8GmqfEBdVyzgPmjvfFZhRd6GfuZSFEi+N2mP7hl5WROeO0nYXI/3+tQYQMCW2sYVxjJyYCOyciSHLeR4LtULS2lradbRCkz8vRSFs5D2+JDzIZEGfl2SXNawqReO5/iW4vrp1xibkOfs4ET0zOOXcozT6Rl/uFZjJhF4ox349XkCExbPQKrxSN49TymwoZ1U2gH+R3I+DGV30f7wm/+C8+5O+eBiMrEPfN0mXdAZ1IM4kNfJdnH2+SjpheznNXrlX2t3iwyj+l9wa6dzCI/fnhRvZn+f344hhsK3hRV50eBbFLgfnEvGN9JtQ/5aYWvBAAAAAElFTkSuQmCC)](https://dmno.dev)');
    // little "D"
    // jsDocLines.push(`[![](data:image/svg+xml;utf-8,${dmnoLogoSvg})](https://dmno.dev)`);
  }



  // more ideas
  // - we have an `exampleValue` property we could include
  // - there's also a `@example` jsdoc directive which is meant to show a code example
  // - could add info about the original source of an item if it has been picked?
  // - could include text about type settings / validations


  if (jsDocLines.length === 1) {
    itemSrc.push(`/** ${jsDocLines[0]} */`);
  } else if (jsDocLines.length > 1) {
    itemSrc.push(...[
      '/**',
      ..._.flatMap(jsDocLines, (line) => [` * ${line}`, ' *']),
      ' */',
    ]);
  }

  // TODO: logic should probably be within the Item class(es) and we still need to figure out how to identify these types...
  const baseType = itemType.primitiveTypeFactory;
  let itemTsType = 'string';
  if (baseType === DmnoBaseTypes.string) {
    itemTsType = 'string';
  } else if (baseType === DmnoBaseTypes.number) {
    itemTsType = 'number';
  } else if (baseType === DmnoBaseTypes.boolean) {
    itemTsType = 'boolean';
  } else if (baseType === DmnoBaseTypes.enum) {
    // enums have several different formats we need to handle
    const rawEnumOptions = itemType.primitiveType.typeInstanceOptions;
    let enumOptions = [] as Array<any>;
    if (_.isArray(rawEnumOptions)) {
      // extended definition case
      // ex [{ value: 'a', description: 'about a' }, ...]
      if (_.isObject(rawEnumOptions[0]) && 'value' in rawEnumOptions[0]) {
        enumOptions = _.map(rawEnumOptions, (o) => o.value);

      // array of values case
      // ex: ['a', 'b', 'c']
      } else {
        enumOptions = rawEnumOptions;
      }

    // key/val { a: 'about a', b: 'b description' } case
    } else if (_.isObject(rawEnumOptions)) {
      enumOptions = _.keys(rawEnumOptions);
    }

    itemTsType = _.map(enumOptions, JSON.stringify).join(' | ');
  } else if (baseType === DmnoBaseTypes.object) {
    // TODO: recursive nested stuff...
    itemTsType = '{}';
  }


  itemSrc.push(`readonly ${item.key}${itemType.getDefItem('required') ? '' : '?'}: ${itemTsType};`);
  itemSrc.push('');
  return _.map(itemSrc, (line) => `${i}${line}`);
}


