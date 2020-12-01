context('Timezone Picker', () => {
  it('displays only the selected timezone', () => {
    cy.visit('/test.html');

    cy.findByText(/London/i).should('exist');
    cy.findByRole('listbox').should('not.exist');
    cy.findByPlaceholderText(/search/i).should('not.exist');
  });

  it('allows the user to open and search in the timezone dropdown', () => {
    cy.visit('/test.html');

    // Expand the dropdown
    cy.findByLabelText(/Change timezone/i).click();
    cy.findByRole('listbox').should('exist');
    cy.findByPlaceholderText(/search/i).should('exist');
    cy.findByTitle('Clear search text').should('not.exist');

    // Type to filter
    cy.findByPlaceholderText(/search/i).type('be');
    cy.findByTitle('Clear search text').should('exist');
    cy.findByLabelText('Select London').should('not.exist');
    cy.findByLabelText('Select Berlin').should('exist');
    cy.findByLabelText('Select Belize').should('exist');
    cy.findByPlaceholderText(/search/i).type('rl');
    cy.findByLabelText('Select Berlin').should('exist');
    cy.findByLabelText('Select Belize').should('not.exist');

    // Clear the filter
    cy.findByTitle('Clear search text').click();
    cy.findByPlaceholderText(/search/i).should('be.empty');
    cy.findByTitle('Clear search text').should('not.exist');

    // Type again
    cy.findByPlaceholderText(/search/i).type('berl');

    // Select a timezone
    cy.findByLabelText('Select Berlin').click();
    cy.findByLabelText(/Berlin is currently selected/i).should('exist');
    cy.findByRole('listbox').should('not.exist');
    cy.findByPlaceholderText(/search/i).should('not.exist');

    // Check that the events fired and the correct data has been passed
    cy.findByTestId('payload-timezone').should('exist');
    cy.findByTestId('payload-zonedDatetime').should('exist');
    cy.findByTestId('payload-utcDatetime').should('exist');
    cy.findByTestId('payload-timezone').contains('Europe/Berlin');
  });

  it('allows the user to open and close the timezone dropdown', () => {
    cy.visit('/test.html');

    cy.findByText(/London/i).should('exist');
    cy.findByRole('listbox').should('not.exist');
    cy.findByPlaceholderText(/search/i).should('not.exist');

    // Expand the dropdown
    cy.findByLabelText(/Change timezone/i).click();

    cy.findByRole('listbox').should('exist');
    cy.findByPlaceholderText(/search/i).should('exist');

    // Collapse the dropdown
    cy.findByRole('listbox').type('{esc}');

    cy.findByText(/London/i).should('exist');
    cy.findByRole('listbox').should('not.exist');
    cy.findByPlaceholderText(/search/i).should('not.exist');
  });
});
