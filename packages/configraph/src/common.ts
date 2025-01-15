export type ExternalDocsEntry = {
  description?: string,
  url: string,
};

// TODO: maybe want to add more restrictions on keys?
// config item keys are all checked against this regex
// currently it must start with a letter (to make it a valid js property)
// and can only contain letters, number, and underscore
// we may want to restrict "__" if we use that as the nesting separator for env var overrides?
export const VALID_NODE_KEY_REGEX = /^[a-z]\w*$/i;


// TODO: probably need to allow anything since it can be used in json objects?
export const VALID_NODE_PATH_REGEX = /[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)*/i;

// both of these separators are used within IDs throughout the system
// they should not be valid within npm package names because we default service IDs to the package.json name
// and they should not be the same

// separates parts of an entity id when it extends a template ex: `someEntity*templateRoot`
export const ENTITY_TEMPLATE_ID_SEP = '*';
// separates a node full path ex: `entityid!nodepath`
export const NODE_FULL_PATH_SEP = '!';
