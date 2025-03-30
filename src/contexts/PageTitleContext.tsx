import React, { createContext, useContext, useState, ReactNode } from 'react';

interface Breadcrumb {
  text: string;
  href?: string;
}

interface PageTitleContextType {
  title: string;
  breadcrumbs: Breadcrumb[];
  setTitle: (title: string) => void;
  setBreadcrumbs: (breadcrumbs: Breadcrumb[]) => void;
}

const PageTitleContext = createContext<PageTitleContextType>({
  title: '',
  breadcrumbs: [],
  setTitle: () => {},
  setBreadcrumbs: () => {},
});

export const usePageTitle = () => useContext(PageTitleContext);

interface PageTitleProviderProps {
  children: ReactNode;
}

export const PageTitleProvider: React.FC<PageTitleProviderProps> = ({ children }) => {
  const [title, setTitle] = useState('');
  const [breadcrumbs, setBreadcrumbs] = useState<Breadcrumb[]>([]);

  return (
    <PageTitleContext.Provider
      value={{
        title,
        breadcrumbs,
        setTitle,
        setBreadcrumbs,
      }}
    >
      {children}
    </PageTitleContext.Provider>
  );
};
