# timezone-picker

## Installation

```
yarn add svelte-timezone-picker
```

```
npm i --save svelte-timezone-picker
```

## Usage

### Svelte component

To use it in your Svelte app, simply import it as a component.

```html
<script>
  import TimezonePicker from 'svelte-timezone-picker';

  let datetime = '2020-06-10T19:30';
  let timezone = 'Europe/London';
</script>

<TimezonePicker {datetime} {timezone} />
```

### Web component

To use it as a web component, add the `index.js` file to your page and use it as a regular HTML element.

```html
<!-- use the new timezone-picker element -->
<timezone-picker
  datetime="2020-06-10T19:30"
  timezone="Europe/London"
></timezone-picker>

<!-- link it as module script -->
<script type="module" src="/path/to/web/index.js"></script>

<!-- listen for the update event on the picker -->
<script>
  window.addEventListener('load', () => {
    const picker = document.querySelector('timezone-picker');
    picker.$on('update', (event) => {
      const { timezone, datetime, utcDatetime, zonedDatetime } = event.detail;
      // do stuff with the data
    });
  });
</script>
```

### Props

| Property           | Type    | Required? | Description                                                                      | Default                                            |
| :----------------- | :------ | :-------: | :------------------------------------------------------------------------------- | :------------------------------------------------- |
| `datetime`         | String  |           | The datetime value you are transforming. Must be a valid datetime.               | `new Date()`                                       |
| `timezone`         | String  |           | The current timezone. Must be a valid timezone from IANA.                        | `Intl.DateTimeFormat().resolvedOptions().timeZone` |
| `expanded`         | Boolean |           | Whether the dropdown should be automatically expanded or not.                    | `false`                                            |
| `allowedTimezones` | Array   |           | Control which timezones display in the list. Must be a valid timezone from IANA. | `null`                                             |

### Events

| Name     | Description                                    | Return                                                                                                                                              |
| :------- | :--------------------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------- |
| `update` | Dispatched every time you change the timezone. | An object with the selected timezone, the provided datetime value, the datetime in UTC format and the datetime converted for the selected timezone. |

### Styling

You can use CSS variables to style the DOM elements of timezone-picker.

```css
:root {
  --color-white: #fff;
  --color-info-900: #076196;
  --color-gray-100: rgba(0, 0, 0, 0.2);
  --color-gray-400: #acacac;
  --color-gray-600: #757575;
  --color-gray-900: #292929;
}
```

Check out the [Demo](./demo).

## License

MIT License - fork, modify and use however you want.

[license-badge]: https://img.shields.io/npm/l/svelte-timezone-picker.svg?style=flat-square
