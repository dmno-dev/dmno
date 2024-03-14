import json from './typedoc-output.json';

export const getSettingsForType = (type: string) => {
  const temp = json?.children?.find((i) => i.name === type);
  // console.log('temp', temp);
  // TODO handle different top level shapes: declaration, union, etc
  // return prettyFormatTypeSettings(temp?.type?.declaration?.children || temp?.type?.types);
  return prettyFormatTypeSettings(temp?.type);
};

const prettyFormatTypeSettings = (rawSettings: any) => {
  if (!rawSettings) return null;

  let settings;

  if (rawSettings?.declaration?.children) {
    settings = rawSettings.declaration.children;
  } else if (rawSettings?.types) {
    settings = rawSettings.types;
    // console.log('settings', settings);
  }


  return (settings.map((i: any) => {
    // if (i.declaration?.children) {
    //   return prettyFormatTypeSettings(i.declaration?.children) || '';
    // }
    const type = i.type?.name || i.name || i.type.type;
    console.log('type', type, i);
    let propertyType;
    switch (type) {
      case 'union':
        propertyType = i.type.types.map((i: any) => i.name).join(' | ');
        break;
      case 'intrinsic':
        propertyType = i.type.name;
        break;
      case 'reflection':
        propertyType = 'function';
        return;
      case 'Record':
        propertyType = `Record<${i.type.typeArguments.map((i: any) => i.name).join(', ')}>`;
        break;
      case 'reference':
        propertyType = i.type.types.map((i: any) => i.name).join(' & ');
        // console.log('reference', i);
        break;
      case 'intersection':
        return;
      default:
        propertyType = i.type.name;
        // console.log('default', i);
        break;
    }

    // TODO handle array and build out children recursively

    return {
      name: i.name,
      type: propertyType || typeof i.type, // TODO handle non-strings
      required: !i.flags?.isOptional,
      description: i.comment?.summary[0]?.text || '',
    };
  }));
};

// TODO fix output formatting
export const getSchemaStringFromTypes = (type: string) => {
  const settings = getSettingsForType(type);
  const properties = settings.map((i: any) => {
    return `${i?.name}${i?.required ? '' : '?'}: ${i?.type}`;
  });

  return `{
    ${properties.join(',\n')}
  }`;
};


