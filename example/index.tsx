import 'react-app-polyfill/ie11';
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { useCachedResource, Cache, CacheContext, CacheProvider } from '../.';

const cache = new Cache('main');

function fetchAsync(ms: number) {
	return new Promise((resolve, reject) => {
		setTimeout(
			() =>
				resolve({
					userName: 'Daniel',
					email: 'drivas12@googlemail.com',
					randomNumber: Math.random(),
				}),
			ms
		);
	});
}

const fetch5s = fetchAsync.bind(null, 5000);

const App = () => {
	const [showAnother, setShowAnother] = React.useState(false);
	return (
		<div>
			<ResourceView />
			{showAnother && <ResourceView />}
			<button onClick={() => setShowAnother(p => !p)}>Show/Hide</button>
		</div>
	);
};

const ResourceView = () => {
	const stuff = useCachedResource('contacts', fetch5s, {
		msLongLoadAlert: 2000,
	});
	return (
		<div>
			<pre>{JSON.stringify(stuff, null, 2)}</pre>
		</div>
	);
};

ReactDOM.render(
	<CacheProvider cache={cache}>
		<App />
	</CacheProvider>,
	document.getElementById('root')
);
