import json from './typedoc-output.json';

export const getSettingsForType = (type: string) => {
  const temp = json?.children?.find((i) => i.name === type);
  return prettyFormatTypeSettings(temp?.type);
};

const prettyFormatTypeSettings = (rawSettings: any) => {
  if (!rawSettings) return null;

  let settings;

  if (rawSettings?.declaration?.children) {
    settings = rawSettings.declaration.children;
  } else if (rawSettings?.types) {
    settings = rawSettings.types;
  }


  return (settings.map((i: any) => {
    const type = i.type?.name || i.type.type;
    let propertyType;
    switch (type) {
      case 'union':
        propertyType = i.type?.types?.map((i: any) => i.name).join(' | ');
        break;
      case 'intrinsic':
        propertyType = type;
        break;
      case 'reflection':
        propertyType = i.type?.declaration?.children?.map((i: any) => i.name).join(', ');
        propertyType = propertyType ? `{ ${propertyType} }` : 'function()';
        break;
      case 'Record':
        propertyType = `Record<${i.type?.typeArguments.map((i: any) => i.name).join(', ')}>`;
        break;
      case 'reference':
        propertyType = i.type?.types?.map((i: any) => i.name).join(' & ');
        break;
      case 'Omit':
        propertyType = `Omit<${i.typeArguments?.map((i: any) => i.name || i.value).join(', ')}>`;
        break;
      case 'intersection':
        break;
      default:
        propertyType = type;
        break;
    }

    // TODO handle array and build out children recursively

    return {
      name: i.name || i.type?.name,
      type: propertyType,
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


