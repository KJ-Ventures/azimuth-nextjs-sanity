const sanityClient = require('@sanity/client');
const _ = require('lodash');

const projectId = process.env.SANITY_PROJECT_ID;
const dataset = process.env.SANITY_DATASET;
const token = process.env.SANITY_TOKEN;

module.exports = {
    getObjectsOfTypes,
    getObjectsOfUserTypes,
    getObjectsForPageWithSlug,
    listenToUserTypes,
    resolveReferences
};

function getSanityClient() {
    return sanityClient({
        projectId: projectId,
        dataset: dataset,
        token: token,
        useCdn: false
    });
}

function getObjectsForPageWithSlug({ slug, ...options }) {
    const client = getSanityClient();
    return client.fetch('*[slug.current==$slug || _type in ["site_config", "post"] || _type == "sanity.imageAsset"]', {slug: slug}).then(data => {
        return processData(data, options);
    });
}

function getObjectsOfTypes({ types, ...options }) {
    const client = getSanityClient();
    return client.fetch('*[_type in $types]', {types: types}).then(data => {
        return processData(data, options);
    });
}

function getObjectsOfUserTypes(options) {
    const client = getSanityClient();
    const query = '*[!(_id in path("_.**"))]';
    return client.fetch(query).then(data => {
        const result = processData(data, options);
        if (options.listen) {
            listenToUserTypes(_.assign(options, { client }), data, options.listen);
        }
        return result;
    });
}

function listenToUserTypes(options, data, callback) {
    const client = _.get(options, 'client', getSanityClient());
    const query = '*[!(_id in path("_.**"))]';
    return client.listen(query).subscribe(update => {
        const docId = _.get(update, 'documentId');
        const docIndex = _.findIndex(data, _.matchesProperty('_id', docId));
        const transition = _.get(update, 'transition');
        console.log(`[sanity-client] got event transition: '${transition}', documentId: '${docId}'`);
        if (_.includes(['appear', 'update'], transition)) {
            const doc = _.get(update, 'result');
            if (docIndex > -1) {
                // replace the document with the updated document
                data[docIndex] = doc;
            } else {
                // append new document to the end
                data.push(doc);
            }
        } else if (_.get(update, 'transition') === 'disappear') {
            if (docIndex > -1) {
                // remove the deleted document
                _.pullAt(data, [docIndex]);
            }
        }
        const result = processData(data, options);
        callback(result);
    });
}

function processData(data, options = {}) {
    if (options.resolveReferences) {
        data = resolveReferences(data);
    }
    if (options.overlayDrafts) {
        data = overlayDrafts(data);
    }
    if (options.removeAssets) {
        data = _.reject(data, {_type: 'sanity.imageAsset'});
    }
    return data;
}

function resolveReferences(data) {
    const objectsById = _.keyBy(data, '_id');
    const cache = {};

    function resolve(item, idStack = []) {
        const id = _.get(item, '_id');
        if (_.has(cache, id)) {
            return cache[id];
        }
        idStack = _.concat(idStack, id);
        const result = _.cloneDeepWith(item, (value) => {
            const refId = _.get(value, '_ref');
            if (refId && _.has(objectsById, refId) && !_.includes(idStack, refId)) {
                return resolve(_.get(objectsById, refId), idStack);
            }
        });
        cache[id] = result;
        return result;
    }

    return _.map(data, item => {
        return resolve(item);
    });
}

function overlayDrafts(documents) {
    const docGroups = _.groupBy(documents, doc => isDraftId(doc._id) ? 'drafts' : 'published');
    const documentsByPureId = _.keyBy(docGroups.published, '_id');
    _.forEach(docGroups.drafts, doc => {
        documentsByPureId[getPureObjectId(doc._id)] = doc;
    });
    return _.values(documentsByPureId);
}

const DRAFT_ID_PREFIX = 'drafts.';

function isDraftId(srcObjectId) {
    return srcObjectId && srcObjectId.startsWith(DRAFT_ID_PREFIX);
}

function getPureObjectId(srcObjectId) {
    return isDraftId(srcObjectId) ? srcObjectId.replace(DRAFT_ID_PREFIX, '') : srcObjectId;
}

function getDraftObjectId(srcObjectId) {
    return isDraftId(srcObjectId) ? srcObjectId : `${DRAFT_ID_PREFIX}${srcObjectId}`;
}