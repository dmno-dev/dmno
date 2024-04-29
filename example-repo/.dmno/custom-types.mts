import { DmnoBaseTypes, createDmnoDataType } from "dmno";

export const GA4MeasurementId = createDmnoDataType({
  extends: DmnoBaseTypes.string({ startsWith: 'G-', }),
  typeDescription: 'unique ID for a site registered in Google Analytics 4',
  externalDocs: {
    description: 'Google Analytics glossary',
    url: 'https://support.google.com/analytics/answer/12270356?hl=en',
  },
  ui: {
    icon: 'bi:google',
  }
});
