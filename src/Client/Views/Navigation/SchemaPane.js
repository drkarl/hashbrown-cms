'use strict';

const ProjectHelper = require('Client/Helpers/ProjectHelper');
const RequestHelper = require('Client/Helpers/RequestHelper');
const SchemaHelper = require('Client/Helpers/SchemaHelper');

const NavbarPane = require('./NavbarPane');
const NavbarMain = require('./NavbarMain');

/**
 * The Schema navbar pane
 * 
 * @memberof HashBrown.Client.Views.Navigation
 */
class SchemaPane extends NavbarPane {
    /**
     * Event: Click remove schema
     */
    static onClickRemoveSchema() {
        let $element = $('.cr-context-menu__target-element'); 
        let id = $element.data('id');
        let schema = SchemaHelper.getSchemaByIdSync(id);
        
        function onSuccess() {
            debug.log('Removed schema with id "' + id + '"', this); 
            
            RequestHelper.reloadResource('schemas')
            .then(function() {
                NavbarMain.reload();
                
                // Cancel the SchemaEditor view if it was displaying the deleted content
                if(location.hash == '#/schemas/' + id) {
                    location.hash = '/schemas/';
                }
            });
        }

        if(!schema.isLocked) {
            new HashBrown.Views.Modals.MessageModal({
                model: {
                    title: 'Delete schema',
                    body: 'Are you sure you want to delete the schema "' + schema.name + '"?'
                },
                buttons: [
                    {
                        label: 'Cancel',
                        class: 'btn-default',
                        callback: function() {
                        }
                    },
                    {
                        label: 'OK',
                        class: 'btn-danger',
                        callback: function() {
                            RequestHelper.request('delete', 'schemas/' + id)
                            .then(onSuccess)
                            .catch(UI.errorModal);
                        }
                    }
                ]
            });
        } else {
            new HashBrown.Views.Modals.MessageModal({
                model: {
                    title: 'Delete schema',
                    body: 'The schema "' + schema.name + '" is locked and cannot be removed'
                },
                buttons: [
                    {
                        label: 'OK',
                        class: 'btn-default',
                        callback: function() {
                        }
                    }
                ]
            });
        }
    }

    /**
     * Event: Click new schema
     */
    static onClickNewSchema() {
        let parentId = $('.cr-context-menu__target-element').data('id');
        let parentSchema = SchemaHelper.getSchemaByIdSync(parentId);

        RequestHelper.request('post', 'schemas/new', parentSchema)
        .then((newSchema) => {
            return RequestHelper.reloadResource('schemas')
            .then(() => {
                NavbarMain.reload();

                location.hash = '/schemas/' + newSchema.id;
            });
        })
        .catch(UI.errorModal);
    }
    
    /**
     * Event: Click pull Schema
     */
    static onClickPullSchema() {
        let schemaEditor = Crisp.View.get('SchemaEditor');
        let pullId = $('.cr-context-menu__target-element').data('id');

        RequestHelper.request('post', 'schemas/pull/' + pullId, {})
        .then(() => {
            return RequestHelper.reloadResource('schemas');
        })
        .then(() => {
            NavbarMain.reload();
           
			location.hash = '/schemas/' + pullId;
		
			let editor = Crisp.View.get('SchemaEditor');

			if(editor && editor.model.id == pullId) {
                editor.model = null;
				editor.fetch();
			}
        }) 
        .catch(UI.errorModal);
    }
    
    /**
     * Event: Click push Schema
     */
    static onClickPushSchema() {
		let $element = $('.cr-context-menu__target-element');
        let pushId = $element.data('id');

		$element.parent().addClass('loading');

        RequestHelper.request('post', 'schemas/push/' + pushId)
        .then(() => {
            return RequestHelper.reloadResource('schemas');
        })
        .then(() => {
            NavbarMain.reload();
        }) 
        .catch(UI.errorModal);
    }

    /**
     * Init
     */
    static init() {
        if(!currentUserHasScope('schemas')) { return; }

        NavbarMain.addTabPane('/schemas/', 'Schemas', 'gears', {
            getItems: () => { return resources.schemas; },

            // Item context menu
            getItemContextMenu: (item) => {
                let menu = {};
                let isSyncEnabled = HashBrown.Helpers.SettingsHelper.getCachedSettings(ProjectHelper.currentProject, null, 'sync').enabled;

                menu['This schema'] = '---';
                menu['New child schema'] = () => { this.onClickNewSchema(); };
                menu['Copy id'] = () => { this.onClickCopyItemId(); };
                
                if(!item.sync.hasRemote && !item.sync.isRemote && !item.isLocked) {
                    menu['Remove'] = () => { this.onClickRemoveSchema(); };
                }
                
                if(item.isLocked && !item.sync.isRemote) { isSyncEnabled = false; }

                if(isSyncEnabled) {
                    menu['Sync'] = '---';
                    
                    if(!item.sync.isRemote) {
                        menu['Push to remote'] = () => { this.onClickPushSchema(); };
                    }

                    if(item.sync.hasRemote) {
                        menu['Remove local copy'] = () => { this.onClickRemoveSchema(); };
                    }

                    if(item.sync.isRemote) {
                        menu['Pull from remote'] = () => { this.onClickPullSchema(); };
                    }
                }

                return menu;
            },
            
            // Set general context menu items
            paneContextMenu: {
                'General': '---',
                'Refresh': () => { this.onClickRefreshResource('schemas'); }
            },

            // Hierarchy logic
            hierarchy: function(item, queueItem) {
                queueItem.$element.attr('data-schema-id', item.id);
              
                if(item.parentSchemaId) {
                    queueItem.parentDirAttr = {'data-schema-id': item.parentSchemaId };

                } else {
                    queueItem.parentDirAttr = {'data-schema-type': item.type};
                }
            }
        });
    }
}

module.exports = SchemaPane;
