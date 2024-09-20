import _ from 'lodash-es';
import {
  Configraph, createConfigraphDataType, ConfigraphBaseTypes, inject,
  ConfigraphPlugin,
  createResolver,
  configPath,
} from '@dmno/configraph';
import { getPrettyItemSummary } from '../src/pretty-formatter';


// class ExamplePlugin extends ConfigraphPlugin {

// }
// const ExamplePlugin = createConfigraphPlugin({
//   inputSchema: {
//     input1: {
//       extends: ConfigraphBaseTypes.email({ normalize: true }),
//       required: true,
//     },
//   },
//   helpers: {

//   },
//   resolvers: {
//     resolver1: (baseValue: number) => {
//       return createResolver({
//         label: 'plugin-resolver-1',
//         resolve(ctx) {
//           return `resolve-${baseValue + 1}`;
//         },
//       });
//       // return createR;
//     },
//     resolver2: 'foo',
//   },
// });

const InjectableType = createConfigraphDataType({});

class ExamplePlugin extends ConfigraphPlugin {
  constructor(id: string) {
    super(id, {
      inputSchema: {
        prop1: { extends: 'string', value: 'prop1-val' },
        pluginInputInjectTest: { extends: InjectableType, value: inject() },
      },
    });
  }

  resolver1(baseValue: number) {
    return this.createResolver({
      label: 'plugin-resolver-1',
      resolve: (ctx) => {
        return `PLUGIN-${this.inputValue('prop1')}-${this.inputValue('pluginInputInjectTest')}-${baseValue}`;
      },
    });
  }
}

const plugin = new ExamplePlugin('p1');


const g = new Configraph();

const root = g.createEntity({
  configSchema: {
    injectSource: { extends: InjectableType, value: 'inject-me-plz' },
    pluginTest: { value: plugin.resolver1(999) },
    obj: {
      extends: ConfigraphBaseTypes.object({
        child1: { value: 'c1' },
        child2: { value: 'c2' },
      }),
    },
    pathTest: { value: configPath('obj.child1') },
  },
});
g.registerPlugin(plugin); // defaulted to root entity being the parent


g.processConfig();

// console.log(child1.getConfigNodeByPath('obj.injectDest').dependsOnPathsObj);



for (const entityId of g.sortedEntityIds) {
  const entity = g.entitiesById[entityId];
  if (!entity.isSchemaValid) {
    console.log(entity.schemaErrors);
    process.exit(1);
  }
}

await g.resolveConfig();

// console.log('plugin valid?', examplePlugin.isValid);


console.log();


for (const entityId of g.sortedEntityIds) {
  const entity = g.entitiesById[entityId];
  console.log(`\n> ${entityId} config -----------------`);
  for (const itemKey in entity.configNodes) {
    console.log(getPrettyItemSummary(entity.configNodes[itemKey]));
  }
}

