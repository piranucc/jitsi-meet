import { MultiSelectStateless } from '@atlaskit/multi-select';
import AKInlineDialog from '@atlaskit/inline-dialog';
import Spinner from '@atlaskit/spinner';
import _debounce from 'lodash/debounce';
import React, { Component } from 'react';

import InlineDialogFailure from './InlineDialogFailure';

/**
 * A MultiSelect that is also auto-completing.
 */
class MultiSelectAutocomplete extends Component {

    /**
     * {@code MultiSelectAutocomplete} component's property types.
     *
     * @static
     */
    static propTypes = {
        /**
         * The default value of the selected item.
         */
        defaultValue: React.PropTypes.array,

        /**
         * Indicates if the component is disabled.
         */
        isDisabled: React.PropTypes.bool,

        /**
         * The text to show when no matches are found.
         */
        noMatchesFound: React.PropTypes.string,

        /**
         * The function called when the selection changes.
         */
        onSelectionChange: React.PropTypes.func,

        /**
         * The placeholder text of the input component.
         */
        placeholder: React.PropTypes.string,

        /**
         * The service providing the search.
         */
        resourceClient: React.PropTypes.shape({
            makeQuery: React.PropTypes.func,
            parseResults: React.PropTypes.func
        }).isRequired,

        /**
         * Indicates if the component should fit the container.
         */
        shouldFitContainer: React.PropTypes.bool,

        /**
         * Indicates if we should focus.
         */
        shouldFocus: React.PropTypes.bool
    };

    /**
     * Initializes a new {@code MultiSelectAutocomplete} instance.
     *
     * @param {Object} props - The read-only properties with which the new
     * instance is to be initialized.
     */
    constructor(props) {
        super(props);

        const defaultValue = this.props.defaultValue || [];

        this.state = {
            /**
             * Indicates if the dropdown is open.
             */
            isOpen: false,

            /**
             * The text that filters the query result of the search.
             */
            filterValue: '',

            /**
             * Indicates if the component is currently loading results.
             */
            loading: false,


            /**
             * Indicates if there was an error.
             */
            error: false,

            /**
             * The list of result items.
             */
            items: [],

            /**
             * The list of selected items.
             */
            selectedItems: [ ...defaultValue ]
        };

        this._onFilterChange = this._onFilterChange.bind(this);
        this._onRetry = this._onRetry.bind(this);
        this._onSelectionChange = this._onSelectionChange.bind(this);
        this._sendQuery = _debounce(this._sendQuery.bind(this), 200);
    }

    /**
     * Clears the selected items.
     *
     * @returns {void}
     */
    clear() {
        this.setState({
            selectedItems: []
        });
    }

    /**
     * Renders the content of this component.
     *
     * @returns {ReactElement}
     */
    render() {
        const shouldFitContainer = this.props.shouldFitContainer || false;
        const shouldFocus = this.props.shouldFocus || false;
        const isDisabled = this.props.isDisabled || false;
        const placeholder = this.props.placeholder || '';
        const noMatchesFound = this.props.noMatchesFound || '';

        return (
            <div>
                <MultiSelectStateless
                    filterValue = { this.state.filterValue }
                    isDisabled = { isDisabled }
                    isOpen = { this.state.isOpen }
                    items = { this.state.items }
                    noMatchesFound = { noMatchesFound }
                    onFilterChange = { this._onFilterChange }
                    onRemoved = { this._onSelectionChange }
                    onSelected = { this._onSelectionChange }
                    placeholder = { placeholder }
                    selectedItems = { this.state.selectedItems }
                    shouldFitContainer = { shouldFitContainer }
                    shouldFocus = { shouldFocus } />
                { this._renderLoadingIndicator() }
                { this._renderError() }
            </div>
        );
    }

    /**
     * Sets the state and sends a query on filter change.
     *
     * @param {string} filterValue - The filter text value.
     * @private
     * @returns {void}
     */
    _onFilterChange(filterValue) {
        this.setState({
            // Clean the error if the filterValue is empty.
            error: this.state.error && Boolean(filterValue),
            filterValue,
            isOpen: Boolean(this.state.items.length) && Boolean(filterValue),
            items: filterValue ? this.state.items : []
        });
        if (filterValue) {
            this._sendQuery(filterValue);
        }
    }

    /**
     * Retries the query on retry.
     *
     * @private
     * @returns {void}
     */
    _onRetry() {
        this._sendQuery(this.state.filterValue);
    }

    /**
     * Updates the selected items when a selection event occurs.
     *
     * @param {Object} item - The selected item.
     * @private
     * @returns {void}
     */
    _onSelectionChange(item) {
        const existing
            = this.state.selectedItems.find(k => k.value === item.value);
        let selectedItems = this.state.selectedItems;

        if (existing) {
            selectedItems = selectedItems.filter(k => k !== existing);
        } else {
            selectedItems.push(item);
        }
        this.setState({
            isOpen: false,
            selectedItems
        });

        if (this.props.onSelectionChange) {
            this.props.onSelectionChange(selectedItems);
        }
    }

    /**
     * Renders the error UI.
     *
     * @returns {ReactElement|null}
     */
    _renderError() {
        if (!this.state.error) {
            return null;
        }
        const content = ( // eslint-disable-line no-extra-parens
            <div className = 'autocomplete-error'>
                <InlineDialogFailure
                    onRetry = { this._onRetry } />
            </div>
        );

        return (
            <AKInlineDialog
                content = { content }
                isOpen = { true } />
        );
    }

    /**
     * Renders the loading indicator.
     *
     * @returns {ReactElement|null}
     */
    _renderLoadingIndicator() {
        if (!(this.state.loading
            && !this.state.items.length
            && this.state.filterValue.length)) {
            return null;
        }

        const content = ( // eslint-disable-line no-extra-parens
            <div className = 'autocomplete-loading'>
                <Spinner
                    isCompleting = { false }
                    size = 'medium' />
            </div>
        );

        return (
            <AKInlineDialog
                content = { content }
                isOpen = { true } />
        );
    }

    /**
     * Sends a query to the resourceClient.
     *
     * @param {string} filterValue - The string to use for the search.
     * @returns {void}
     */
    _sendQuery(filterValue) {
        if (!filterValue) {
            return;
        }

        this.setState({
            loading: true,
            error: false
        });

        const resourceClient = this.props.resourceClient || {
            makeQuery: () => Promise.resolve([]),
            parseResults: results => results
        };

        resourceClient.makeQuery(filterValue)
            .then(results => {
                if (this.state.filterValue !== filterValue) {
                    this.setState({
                        loading: false,
                        error: false
                    });

                    return;
                }
                const itemGroups = [
                    {
                        items: resourceClient.parseResults(results)
                    }
                ];

                this.setState({
                    items: itemGroups,
                    isOpen: true,
                    loading: false,
                    error: false
                });
            })
            .catch(() => {
                this.setState({
                    error: true,
                    loading: false,
                    isOpen: false
                });
            });
    }
}

export default MultiSelectAutocomplete;
