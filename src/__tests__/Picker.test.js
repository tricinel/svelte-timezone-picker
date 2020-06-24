import '@testing-library/jest-dom/extend-expect';
import { render, fireEvent } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';

import {
  getZoneLabelAtIndex,
  getTestRegex,
  getTotalZones,
  filterZones,
  keyArrowDown,
  keyArrowUp,
  keyEnter,
  keyEscape
} from '../testUtils';
import Picker from '../Picker.svelte';

jest.mock('../timezones');

const props = {
  datetime: '2016-06-19T08:30',
  timezone: 'Europe/London'
};

describe('The component renders with internal defaults', () => {
  let intlSpy;

  beforeEach(() => {
    intlSpy = jest.spyOn(Intl, 'DateTimeFormat');
  });

  afterEach(() => {
    intlSpy.mockRestore();
    jest.clearAllTimers();
  });

  test(`Shows the browser's timezone selected when rendered without a timezone prop`, () => {
    intlSpy.mockReturnValueOnce({
      resolvedOptions: () => ({
        timeZone: 'UTC'
      })
    });

    const { getByText } = render(Picker, {
      datetime: '2016-06-19T08:30'
    });

    expect(getByText('UTC Time')).toBeInTheDocument();
  });

  test('Sets the datetime to the current datetime when rendered without a datetime prop', () => {
    const { getByText } = render(Picker, {
      timezone: 'Europe/Berlin'
    });

    expect(getByText('Central European Time')).toBeInTheDocument();
  });
});

describe('The component renders with props', () => {
  test('Shows the selected option when rendered with all props', () => {
    const { getByText, getByLabelText } = render(Picker, props);
    const toggleButton = getByLabelText(/Change timezone/i);

    expect(toggleButton).toHaveAttribute('aria-expanded', 'false');
    expect(getByText('London')).toBeInTheDocument();
  });

  test('Shows the listbox by default when the open prop is true', () => {
    const { getByLabelText, getByRole } = render(Picker, {
      ...props,
      open: true
    });
    const toggleButton = getByLabelText(/Change timezone/i);
    const listBox = getByRole('listbox');

    expect(toggleButton).toHaveAttribute('aria-expanded', 'true');
    expect(listBox).toBeInTheDocument();
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
    await fireEvent.keyUp(document.activeElement || document.body, keyEnter);

    // And hide it with Escape
    await fireEvent.keyUp(document.activeElement || document.body, keyEscape);
    expect(toggleButton).toHaveAttribute('aria-expanded', 'false');

    // And we can show toggle expansion again using Enter
    toggleButton.focus();
    await fireEvent.keyUp(document.activeElement || document.body, keyEnter);

    // And hide it by clicking outside of the dropdown, anywhere on the overlay
    const overlay = container.querySelector('.overlay');
    await fireEvent.click(overlay);
    expect(toggleButton).toHaveAttribute('aria-expanded', 'false');
  });

  test('The user can navigate the options using the keyboard', async () => {
    const { getByText, getByLabelText } = render(Picker, {
      ...props,
      open: true
    });

    const first = getZoneLabelAtIndex(0);
    const last = getZoneLabelAtIndex(getTotalZones() - 1);

    // The user pressed the down arrow key, so we move focus to the first option
    await fireEvent.keyUp(
      document.activeElement || document.body,
      keyArrowDown
    );
    expect(getByText(getTestRegex(first))).toHaveFocus();

    // The user pressed the down key, so we move focus to the second option
    await fireEvent.keyUp(
      document.activeElement || document.body,
      keyArrowDown
    );
    expect(getByText(getTestRegex(getZoneLabelAtIndex(1)))).toHaveFocus();

    // The user pressed the up key, so we move focus to the first option
    await fireEvent.keyUp(document.activeElement || document.body, keyArrowUp);
    expect(getByText(getTestRegex(first))).toHaveFocus();

    // The user pressed the up key, so we move focus to the last option because we are at the top of the list
    await fireEvent.keyUp(document.activeElement || document.body, keyArrowUp);
    expect(getByText(getTestRegex(last))).toHaveFocus();

    // The user pressed the Enter key, so we select the option currently focused
    // `last` after the above events
    await fireEvent.keyUp(document.activeElement || document.body, keyEnter);
    expect(
      getByLabelText(`${last} is currently selected. Change timezone`)
    ).toBeInTheDocument();
  });

  test('The use can type to filter the options', async () => {
    const { getAllByRole, getByPlaceholderText } = render(Picker, {
      ...props,
      open: true
    });
    const input = getByPlaceholderText(/search/i);

    await userEvent.type(input, 'bo');
    expect(getAllByRole('option')).toHaveLength(filterZones('bo').length);

    await userEvent.type(input, '{backspace}');
    expect(getAllByRole('option')).toHaveLength(filterZones('b').length);
  });
});
