import {  useEffect ,useRef} from 'react'
const { remote } = window.require('electron')
const { Menu, MenuItem } = remote

const useContextMenu = (itemArray,targetSelectorArr) => {
    let clickedElement = useRef(null)
    useEffect(() => {
        const menu = new Menu()
        itemArray.forEach(menuItem => {
            menu.append(new MenuItem(menuItem))
        })
        const handleContextMenu = (e) => {
            targetSelectorArr.map(targetSelector => {
              if (document.querySelector(targetSelector).contains(e.target)) {
                clickedElement.current = e.target
                menu.popup({
                    window: remote.getCurrentWindow()
                })
            }  
            })
       }
        window.addEventListener('contextmenu', handleContextMenu)
        return () => {
            window.removeEventListener('contextmenu',handleContextMenu)
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    },[])
    return clickedElement
}

export default useContextMenu