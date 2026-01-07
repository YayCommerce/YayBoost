export function getOptionsFromLocalize(type: 'category' | 'product' | 'tag') {
    const localizeData = (window as any)?.yayboostData?.localize;
    
    if (!localizeData) {
      return [];
    }
  
    switch (type) {
      case 'category':
        return (localizeData.categories || []).map((item: any) => ({
          label: item.label,
          value: String(item.id), // ID as string
        }));
      case 'product':
        return (localizeData.products || []).map((item: any) => ({
          label: item.label,
          value: item.value,
        }));
      case 'tag':
        return (localizeData.tags || []).map((item: any) => ({
          label: item.label,
          value: item.value,
        }));
      default:
        return [];
    }
  }

export function formatRecommendLabels (labels: string[]) {
    if (!labels || labels.length === 0) return '-';
    if (labels.length === 1) return labels[0];
    return `${labels[0]} +${labels.length - 1}`;
  };