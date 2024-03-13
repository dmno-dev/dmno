import json from './typedoc-output.json';

export const getSettingsForType = (type: string) => {
  const temp = json?.children?.find((i) => i.name === type);
  // console.log('temp', temp);
  return prettyFormatTypeSettings(temp?.type?.declaration.children);
};

const prettyFormatTypeSettings = (rawSettings: any) => {
  if (!rawSettings) return null;

  return (rawSettings.map((i: any) => {
    const type = i.type.type;
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
        break;
      default:
        propertyType = i.type.name;
        break;
    }

    return {
      name: i.name,
      type: propertyType,
      required: !i.flags.isOptional,
      description: i.comment.summary[0].text,
    };
  }));
};

// TODO fix output formatting
export const getSchemaStringFromTypes = (type: string) => {
  const settings = getSettingsForType(type);
  const properties = settings.map((i: any) => {
    return `${i.name}${i.required ? '' : '?'}: ${i.type}`;
  });

  return `{
    ${properties.join(',\n')}
  }`;
};


