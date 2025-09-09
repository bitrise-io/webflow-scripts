import brandDesignUrl from '../../images/careers/brand_design.svg';
import customerSuccessUrl from '../../images/careers/customer_success.svg';
import dataUrl from '../../images/careers/data.svg';
import engineeringUrl from '../../images/careers/engineering.svg';
import financeUrl from '../../images/careers/finance.svg';
import marketingUrl from '../../images/careers/marketing.svg';
import peopleUrl from '../../images/careers/people.svg';
import productDesignUrl from '../../images/careers/product_design.svg';
import productManagementUrl from '../../images/careers/product_management.svg';
import salesUrl from '../../images/careers/sales.svg';
import supportUrl from '../../images/careers/support.svg';

const careerImages = {
  getImageBySlug: (slug) => {
    switch (slug) {
      case 'brand_design':
        return brandDesignUrl;
      case 'customer_success':
        return customerSuccessUrl;
      case 'data':
        return dataUrl;
      case 'engineering':
        return engineeringUrl;
      case 'finance':
        return financeUrl;
      case 'marketing':
        return marketingUrl;
      case 'people':
        return peopleUrl;
      case 'product_design':
        return productDesignUrl;
      case 'product_management':
        return productManagementUrl;
      case 'sales':
        return salesUrl;
      case 'support':
        return supportUrl;
      default:
        return null;
    }
  },
};

export default careerImages;
