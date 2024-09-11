/*
- how do you define a template?
- how do you use a template?
- add multiple entities to it?
- what if those are using templates as well?
- how to override behaviour of the template itself (ex: add more config nodes)
- how do ids work? what about paths, especially with `pick`
- how to override _values_ within template
  - can be multiple levels of overrides happening!
  - how to override deep within the template? again questions with paths/ids?

- how to define tests for a template? data types too?
- how are templates/data types related? should there be a more formal "package" concept?
  - default values for things like icon/color? links to docs? etc?
*/

const SomeTemplate = new ConfigraphEntityTemplate({});
// or
const SomeTemplate = createConfigraphEntityTemplate({
  id: 'template-root',
  schema: {
    // ...
  },
  children: [
    {
      id: 'template-child1',
      schema: {},
    },
  ],
});

/*
  I may want to define template chidlren inline
  or I may want to use another existing template!
*/


const MyTemplate = initConfigraphTemplate();
MyTemplate.createEntity({
  id: 'root',
});
MyTemplate.createEntity({
  id: 'child',
  parentId: 'root',
  pick: { source: 'root' },
});
MyTemplate.createEntity({
  id: 'grandchild',
});

// could use chaining?

// do I need to finish/freeze the template somehow?
MyTemplate.freeze();
// or can I leave it open for further modifications?



// How do we _use_ a template
const child1 = graph.createEntity({
  extends: MyTemplate,
  overrides: [
    { child: 'child1', key: 'asdf', value: 'asdf' },
  ]
    
  },
});

const child1 = graph.createEntityFromTemplate(MyTemplate, {

});
