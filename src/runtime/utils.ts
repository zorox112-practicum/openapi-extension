import type {RefObject} from 'react';
import type {V3Parameters, V3Security} from '../includer/models';
import type {Field, FormState} from './types';

export const merge = <T, R>(items: T[], iterator: (item: T) => Record<string, R> | undefined) => {
    return items.reduce((acc, item) => Object.assign(acc, iterator(item)), {} as Record<string, R>);
};

export const prepareBody = ({
    bodyType,
    bodyJson,
    bodyFormData,
}: {
    bodyType?: string;
    bodyJson: string | undefined;
    bodyFormData: FormData | undefined;
}) => {
    switch (bodyType) {
        case 'application/json':
            return {body: bodyJson};
        case 'multipart/form-data':
            return {body: bodyFormData};

        default:
            return {};
    }
};

export const prepareHeaders = ({
    headers,
    security,
}: {
    security?: V3Security[];
    headers?: V3Parameters;
}) => {
    const preparedHeaders = headers ? [...headers] : [];

    const hasOAuth2 = security?.find(({type}) => type === 'oauth2');
    if (hasOAuth2) {
        preparedHeaders.push({
            name: 'Authorization',
            schema: {
                type: 'string',
            },
            in: 'header',
            required: true,
            description: '',
            example: 'Bearer <token>',
        });
    }

    return preparedHeaders;
};

export const prepareRequest = (
    urlTemplate: string,
    {search, headers, path, bodyJson, bodyFormData}: FormState,
    bodyType?: string,
) => {
    const requestUrl = Object.entries(path).reduce((acc, [key, value]) => {
        return acc.replace(`{${key}}`, encodeURIComponent(value));
    }, urlTemplate);

    const searchParams = new URLSearchParams();
    Object.entries(search).forEach(([key, value]) => {
        searchParams.append(key, value);
    });

    const searchString = searchParams.toString();
    const url = requestUrl + (searchString ? '?' + searchString : '');

    return {
        url,
        headers:
            bodyType === 'application/json'
                ? {
                      ...headers,
                      'Content-Type': 'application/json',
                  }
                : headers,
        // TODO: match request types (www-form-url-encoded should be handled too)
        body: prepareBody({bodyFormData, bodyJson, bodyType}),
    };
};

export function collectErrors(fields: Record<string, RefObject<Field>>) {
    const errors = Object.keys(fields).reduce(
        (acc, key) => {
            const field = fields[key].current;

            if (!field) {
                return acc;
            }

            const error = field.validate();

            if (error) {
                acc[key] = error;
            }

            return acc;
        },
        {} as Record<string, unknown>,
    );

    if (!Object.keys(errors).length) {
        return null;
    }

    return errors;
}

export function collectValues<F extends Record<string, RefObject<Field>>>(
    fields: F,
): Record<keyof F, unknown> {
    return Object.keys(fields).reduce(
        (acc, key: keyof F) => {
            const field = fields[key].current;

            if (!field) {
                return acc;
            }

            acc[key] = field.value();

            return acc;
        },
        {} as Record<keyof F, unknown>,
    );
}
