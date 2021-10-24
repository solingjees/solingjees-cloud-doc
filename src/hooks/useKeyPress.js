import {
    useState,
    useEffect
} from 'react'

const useKeyPress = (targetkeyCode) => {
    const [keypressed, setkeypressed] = useState(false)
    const keyDownHandler = ({
        keyCode
    }) => {
        if (keyCode === targetkeyCode) {
            setkeypressed(true)
        }
    }
    const keyUpHandler = ({
        keyCode
    }) => {
        if (keyCode === targetkeyCode) {
            setkeypressed(false)
        }
    }
    useEffect(() => {
        document.addEventListener('keydown', keyDownHandler)
        document.addEventListener('keyup', keyUpHandler)
        return () => {
            document.removeEventListener('keydown', keyDownHandler)
            document.removeEventListener('keyup', keyUpHandler)
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
    return keypressed
}

export default useKeyPress