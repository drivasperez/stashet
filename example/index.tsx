import 'react-app-polyfill/ie11';
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { useCachedValue } from '../.';

function fetchAsync(ms: number) {
	return new Promise((resolve, reject) => {
		setTimeout(
			() => resolve({ userName: 'Daniel', email: 'drivas12@googlemail.com' }),
			ms
		);
	});
}

const fetch5s = fetchAsync.bind(null, 5000);

const App = () => {
	const stuff = useCachedValue('contacts', fetch5s, { msLongLoadAlert: 2000 });
	return (
		<div>
			<pre>{JSON.stringify(stuff, null, 2)}</pre>
		</div>
	);
};

ReactDOM.render(<App />, document.getElementById('root'));
