import '@testing-library/jest-dom/extend-expect';
import { render, fireEvent } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';

import {
  getZoneLabelAtIndex,
  getTestRegex,
  getTotalZones,
  ungroupedZones,
  keyArrowDown,
  keyArrowUp,
  keyEnter,
  keyEscape,
  keyLetter
} from '../testUtils';
import { filter } from '../utils';
import Picker from '../Picker.svelte';

jest.mock('../timezones');
jest.mock('../utils');

const props = { timezone: 'Europe/London' };

let intlSpy;

beforeEach(() => {
  intlSpy = jest.spyOn(Intl, 'DateTimeFormat');
});

afterEach(() => {
  intlSpy.mockRestore();
  jest.clearAllTimers();
});

describe(`The component doesn't crash when the user passed props are incorrect`, () => {
  let errorSpy;
  let warnSpy;

  beforeEach(() => {
    errorSpy = jest.spyOn(console, 'error');
    warnSpy = jest.spyOn(console, 'warn');
  });

  afterEach(() => {
    errorSpy.mockRestore();
    warnSpy.mockRestore();
  });

  test('Wrong pick type - string', () => {
    render(Picker, { ...props, allowedTimezones: 'a string' });
    expect(errorSpy).toHaveBeenCalledTimes(1);
  });

  test('Wrong pick type - object', () => {
    render(Picker, { ...props, allowedTimezones: {} });
    expect(errorSpy).toHaveBeenCalledTimes(1);
  });

  test('Wrong pick type', () => {
    render(Picker, { ...props, allowedTimezones: 'a string' });
    expect(errorSpy).toHaveBeenCalledTimes(1);
  });
});

describe('The component renders with internal defaults', () => {
  test('Basic snapshot with defaults', async () => {
    intlSpy.mockReturnValueOnce({
      resolvedOptions: () => ({
        timeZone: 'UTC'
      })
    });

    const { getByLabelText, container } = render(Picker, { props });

    expect(container.firstChild).toMatchSnapshot();

    const toggleButton = getByLabelText(/Change timezone/i);
    await fireEvent.click(toggleButton);
    expect(container.firstChild).toMatchSnapshot();
  });

  test(`Shows the browser's timezone selected when rendered without a timezone prop`, () => {
    intlSpy.mockReturnValueOnce({
      resolvedOptions: () => ({
        timeZone: 'UTC'
      })
    });

    const { getByText } = render(Picker);

    expect(getByText(/UTC/i)).toBeInTheDocument();
  });

  test('Sets the datetime to the current datetime when rendered without a datetime prop', () => {
    const { getByText } = render(Picker, {
      timezone: 'Europe/Berlin'
    });

    expect(getByText(/Berlin/i)).toBeInTheDocument();
  });
});

describe('The component renders with accessibility defaults', () => {
  test('The toggle button does not repond to unknown keys', async () => {
    const { getByLabelText } = render(Picker, props);
    const toggleButton = getByLabelText(/Change timezone/i);

    toggleButton.focus();

    // We start with the toggleButton collapsed
    expect(toggleButton).toHaveAttribute('aria-expanded', 'false');

    // We fire some randome keydown event
    await fireEvent.keyDown(document.activeElement || document.body, keyLetter);
    expect(toggleButton).toHaveAttribute('aria-expanded', 'false');
  });
});

describe('The component renders with props', () => {
  test('Shows the selected option when rendered with all props', () => {
    const { getByText, getByLabelText } = render(Picker, props);
    const toggleButton = getByLabelText(/Change timezone/i);

    expect(toggleButton).toHaveAttribute('aria-expanded', 'false');
    expect(getByText(/London/i)).toBeInTheDocument();
  });

  test('Shows the listbox by default when the expanded prop is true', () => {
    const { getByLabelText, getByRole } = render(Picker, {
      ...props,
      expanded: true
    });
    const toggleButton = getByLabelText(/Change timezone/i);
    const listBox = getByRole('listbox');

    expect(toggleButton).toHaveAttribute('aria-expanded', 'true');
    expect(listBox).toBeInTheDocument();
  });

  test('Shows only the allowed timezones when allowedTimezones is used as a prop', () => {
    intlSpy.mockReturnValueOnce({
      resolvedOptions: () => ({
        timeZone: 'UTC'
      })
    });

    const allowedTimezones = ['Australia/Sydney', 'Australia/Melbourne'];
    const { queryAllByRole } = render(Picker, {
      ...props,
      allowedTimezones,
      expanded: true
    });

    expect(queryAllByRole('option')).toHaveLength(3);
  });
});

describe('The component handles user interactions', () => {
  test('The user can click or press Enter on the currently selected timezone and toggle the selector dropdown', async () => {
    const {
      queryByPlaceholderText,
      getByPlaceholderText,
      getByLabelText,
      getByRole,
      container
    } = render(Picker, props);
    const toggleButton = getByLabelText(/Change timezone/i);

    // Initially, the search field is not in the document
    expect(queryByPlaceholderText(/search/i)).not.toBeInTheDocument();
    expect(toggleButton).toHaveAttribute('aria-expanded', 'false');

    await fireEvent.click(toggleButton);
    expect(toggleButton).toHaveAttribute('aria-expanded', 'true');

    // After clicking the toggle button, the search field should be in the document
    expect(getByPlaceholderText(/search/i)).toBeInTheDocument();
    // So should the listbox
    expect(getByRole('listbox')).toBeInTheDocument();

    // We can now hide it
    await fireEvent.click(toggleButton);
    expect(toggleButton).toHaveAttribute('aria-expanded', 'false');

    // And we can show toggle expansion again using Enter
    toggleButton.focus();
    await fireEvent.keyDown(document.activeElement || document.body, keyEnter);
    expect(toggleButton).toHaveAttribute('aria-expanded', 'true');

    // And hide it with Escape
    await fireEvent.keyDown(document.activeElement || document.body, keyEscape);
    expect(toggleButton).toHaveAttribute('aria-expanded', 'false');

    // And we can show toggle expansion again using Enter
    toggleButton.focus();
    await fireEvent.keyDown(document.activeElement || document.body, keyEnter);
    expect(toggleButton).toHaveAttribute('aria-expanded', 'true');

    // And hide it by clicking outside of the dropdown, anywhere on the overlay
    const overlay = container.querySelector('.overlay');
    await fireEvent.click(overlay);
    expect(toggleButton).toHaveAttribute('aria-expanded', 'false');
  });

  test('The user can navigate the options using the keyboard', async () => {
    const { getByRole, getByText, getByLabelText } = render(Picker, {
      ...props,
      timezone: 'Australia/Sydney',
      expanded: true
    });

    const firstOption = getByRole('option', { name: `Select Sydney` });
    const secondOption = getByText(getTestRegex(getZoneLabelAtIndex(1)));
    const thirdOption = getByText(getTestRegex(getZoneLabelAtIndex(2)));
    const last = getZoneLabelAtIndex(getTotalZones() - 1);
    const lastOption = getByText(getTestRegex(last));

    expect(firstOption).toHaveFocus();

    // The user pressed the down arrow key, so we move focus to the second option
    // because the first one is preselected
    await fireEvent.keyDown(
      document.activeElement || document.body,
      keyArrowDown
    );
    expect(secondOption).toHaveFocus();

    // The user pressed the down key, so we move focus to the third option
    await fireEvent.keyDown(
      document.activeElement || document.body,
      keyArrowDown
    );
    expect(thirdOption).toHaveFocus();

    // The user pressed the up key, so we move focus to the second option
    await fireEvent.keyDown(
      document.activeElement || document.body,
      keyArrowUp
    );
    expect(secondOption).toHaveFocus();

    // The user pressed the up key, so we move focus to the first option
    await fireEvent.keyDown(
      document.activeElement || document.body,
      keyArrowUp
    );
    // The user pressed the up key, so we move focus to the last option because we are at the top of the list
    await fireEvent.keyDown(
      document.activeElement || document.body,
      keyArrowUp
    );
    expect(lastOption).toHaveFocus();

    // The user pressed the Enter key, so we select the option currently focused
    // `last` after the above events
    await fireEvent.keyDown(document.activeElement || document.body, keyEnter);
    expect(
      getByLabelText(`${last} is currently selected. Change timezone`)
    ).toBeInTheDocument();
  });

  test('The user can type to filter the options', async () => {
    const { getByTitle, getAllByRole, getByPlaceholderText } = render(Picker, {
      ...props,
      expanded: true
    });
    const input = getByPlaceholderText(/search/i);

    await userEvent.type(input, 'bo');
    expect(getAllByRole('option')).toHaveLength(
      filter('bo', ungroupedZones).length
    );

    await userEvent.type(input, '{backspace}');
    expect(getAllByRole('option')).toHaveLength(
      filter('b', ungroupedZones).length
    );

    await fireEvent.click(getByTitle(/Clear search text/i));
    expect(document.activeElement).toBe(input);
    expect(input).toHaveValue('');
  });
});

describe('Focus is correctly managed', () => {
  test('Focus on the body element by default', async () => {
    const { getByLabelText } = render(Picker, { props });
    expect(document.activeElement.nodeName).toEqual('BODY');

    const toggleButton = getByLabelText(/Change timezone/i);

    toggleButton.focus();
    expect(document.activeElement).toBe(toggleButton);
  });

  test('Focus on the selected timezone if provided', () => {
    const { getByRole } = render(Picker, {
      ...props,
      timezone: 'Australia/Sydney',
      expanded: true
    });

    expect(getByRole('option', { name: `Select Sydney` })).toHaveFocus();
  });

  test('Move focus around depending on user interactions', async () => {
    const { getByRole, getByLabelText, getByPlaceholderText } = render(Picker, {
      ...props,
      timezone: 'Australia/Sydney',
      expanded: true
    });
    const input = getByPlaceholderText(/search/i);
    const toggleButton = getByLabelText(/Change timezone/i);
    const initialOption = getByRole('option', { name: 'Select Sydney' });

    expect(initialOption).toHaveFocus();
    await userEvent.type(input, 's');
    expect(input).toHaveFocus();

    // The user pressed the down arrow key, so we move focus to the next option that contains 's'
    await fireEvent.keyDown(document.activeElement, keyArrowDown);
    expect(getByRole('option', { name: 'Select Lisbon' })).toHaveFocus();

    await fireEvent.keyDown(document.activeElement, keyEnter);
    expect(toggleButton).toHaveFocus();

    await fireEvent.keyDown(document.activeElement, keyEnter);
    await fireEvent.keyDown(document.activeElement, keyArrowDown);
    await fireEvent.keyDown(document.activeElement || document.body, keyEscape);
    expect(toggleButton).toHaveFocus();
  });
});
