export const themeOverrides = {
  common: {
    fontFamily: 'Avenir, "Helvetica Neue", Helvetica, Arial, sans-serif',
    fontSize: '16px',
    primaryColor: '#1E434C'
  },
  Collapse: {
    dividerColor: '#FFFFFF'
  },
  DataTable: {
    tdColorHover: '#FFFFFF',
    thColor: '#FFFFFF',
    thColorHover: '#FFFFFF'
  },
  Drawer: {
    borderRadius: '0',
    resizableTriggerColorHover: '#1E434C'
  },
  Input: {
    borderFocus: '1px solid #1E434C',
    borderHover: '1px solid #1E434C',
    boxShadowFocus: '0 0 0 2px rgba(3, 117, 255, 0.2)'
  },
  Layout: {
    siderColor: '#1E434C'
  },
  Menu: {
    arrowColor: 'rgba(255, 255, 255, 0.7)',
    arrowColorActive: '#FFFFFF',
    arrowColorActiveHover: '#FFFFFF',
    arrowColorChildActive: '#FFFFFF',
    arrowColorChildActiveHover: '#FFFFFF',
    arrowColorHover: 'rgba(255, 255, 255, 0.7)',

    dividerColor: 'rgba(255, 255, 255, .2)',

    itemColorActive: 'rgba(255, 255, 255, 0.15)',
    itemColorActiveCollapsed: 'rgba(255, 255, 255, 0.15)',
    itemColorActiveHover: 'rgba(255, 255, 255, 0.15)',
    itemColorHover: 'rgba(255, 255, 255, 0.15)',

    itemIconColor: 'rgba(255, 255, 255, 0.7)',
    itemIconColorActive: '#FFFFFF',
    itemIconColorActiveHover: '#FFFFFF',
    itemIconColorChildActive: '#FFFFFF',
    itemIconColorChildActiveHover: '#FFFFFF',
    itemIconColorCollapsed: 'rgba(255, 255, 255, 0.7)',
    itemIconColorCollapsedChildActive: '#FFFFFF',
    itemIconColorHover: 'rgba(255, 255, 255, 0.7)',

    itemTextColor: 'rgba(255, 255, 255, 0.7)',
    itemTextColorActive: '#FFFFFF',
    itemTextColorActiveHover: '#FFFFFF',
    itemTextColorChildActive: '#FFFFFF',
    itemTextColorChildActiveHover: 'rgba(255, 255, 255, .5)',
    itemTextColorHover: 'rgba(255, 255, 255, 0.7)'
  },
  Select: {
    menuBoxShadow: '0 0 0 1px rgb(3, 117, 255)',
    peers: {
      InternalSelection: {
        borderFocus: '1px solid #1E434C',
        borderHover: '1px solid #1E434C'
      }
    }
  },
  Slider: {
    dotBorder: '2px solid #1E434C',
    dotBorderActive: '2px solid #1E434C',
    fillColor: '#DBDBDF',
    fillColorHover: '#DBDBDF'
  }
}

export function getValue (valueList = [], locale, type = 'string') {
  return valueList.find(x => x.language === locale)?.[type] || valueList.find(x => !x.language)?.[type] || valueList?.at(0)?.[type]
}
