import * as React from 'react';
import { useResource, Cache, CacheProvider } from '../.';

import { BrowserRouter as Router, Link, Route, Routes } from 'react-router-dom';

const cache = new Cache('main');
type Data = {
  userName: string;
  email: string;
  randomNumber: number;
};

function fetchAsync(ms: number): Promise<Data> {
  const data = {
    userName: 'Daniel',
    email: 'drivas12@googlemail.com',
    randomNumber: Math.random(),
  };

  return new Promise((resolve, _reject) => {
    setTimeout(() => resolve(data), ms);
  });
}

const fetch5s: () => Promise<Data> = fetchAsync.bind(null, 3000);

export const App = () => {
  return (
    <CacheProvider cache={cache}>
      <Router>
        <Routes>
          <Route path="/" element={<PageOne />} />
          <Route path="/2" element={<PageTwo />} />
        </Routes>
      </Router>
    </CacheProvider>
  );
};

const PageOne = () => {
  return (
    <div data-testid="page-1">
      <h1>This is the first view</h1>
      <ResourceView />
      <Link to="/2">Page two</Link>
    </div>
  );
};

const PageTwo = () => {
  const [showAnother, setShowAnother] = React.useState(false);
  return (
    <div data-testid="page-2">
      <h1>
        Now go <Link to="/">back</Link>
      </h1>
      <button onClick={() => setShowAnother(p => !p)}>Show/Hide</button>
      {showAnother && <ResourceView />}
    </div>
  );
};

const ResourceView = () => {
  const [newName, setNewName] = React.useState('');
  const { isLoading, isLongLoad, data, isUpdating } = useResource(
    'contacts',
    fetch5s,
    [],
    {
      msLongLoadAlert: 2000,
    }
  );

  console.log('Is updating', isUpdating);

  if (isLoading) return <h2>Loading...</h2>;

  if (data)
    return (
      <>
        <h2>Data</h2>
        <dl>
          <dt>Name</dt>
          <dd>{data.userName}</dd>
          <dt>Email</dt>
          <dd>{data.email}</dd>
          <dt>A random number</dt>
          <dd>{data.randomNumber}</dd>
        </dl>
        <div>{isUpdating && 'Updating data...'}</div>
        <div>{isLongLoad && 'This is taking a while...'}</div>
        <button onClick={() => cache.invalidateResource('contacts')}>
          Invalidate cache
        </button>
        <input
          value={newName}
          onChange={e => setNewName(e.currentTarget.value)}
        />
        <button
          onClick={() =>
            cache.mutateResource('contacts', prev => ({
              ...prev,
              userName: newName,
            }))
          }
        >
          Change name locally
        </button>
      </>
    );

  return <h2>Error!</h2>;
};
