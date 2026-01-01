import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { PinInput } from '@/components/PinInput'

describe('PinInput', () => {
  it('renders 6 input fields', () => {
    const onComplete = vi.fn()
    render(<PinInput onComplete={onComplete} />)

    const inputs = screen.getAllByRole('textbox')
    expect(inputs).toHaveLength(6)
  })

  it('calls onComplete when all digits are entered', () => {
    const onComplete = vi.fn()
    render(<PinInput onComplete={onComplete} />)

    const inputs = screen.getAllByRole('textbox')

    fireEvent.change(inputs[0], { target: { value: '1' } })
    fireEvent.change(inputs[1], { target: { value: '2' } })
    fireEvent.change(inputs[2], { target: { value: '3' } })
    fireEvent.change(inputs[3], { target: { value: '4' } })
    fireEvent.change(inputs[4], { target: { value: '5' } })
    fireEvent.change(inputs[5], { target: { value: '6' } })

    expect(onComplete).toHaveBeenCalledWith('123456')
  })

  it('only accepts digits', () => {
    const onComplete = vi.fn()
    render(<PinInput onComplete={onComplete} />)

    const inputs = screen.getAllByRole('textbox')

    fireEvent.change(inputs[0], { target: { value: 'a' } })
    expect(inputs[0]).toHaveValue('')

    fireEvent.change(inputs[0], { target: { value: '1' } })
    expect(inputs[0]).toHaveValue('1')
  })

  it('displays error message', () => {
    const onComplete = vi.fn()
    render(<PinInput onComplete={onComplete} error="Invalid PIN" />)

    expect(screen.getByText('Invalid PIN')).toBeInTheDocument()
  })

  it('shows loading state', () => {
    const onComplete = vi.fn()
    render(<PinInput onComplete={onComplete} isLoading />)

    expect(screen.getByText('Verifying...')).toBeInTheDocument()
  })
})
